import * as ImageManipulator from "expo-image-manipulator";
import { Album, Asset, AssetField, MediaType, Query, getPermissionsAsync } from "expo-media-library";

import { suggestCategory } from "@/features/imports/categorize";
import { requestImport } from "@/features/imports/client";
import { accessStatus, dayInMilliseconds, sourceForAlbum, type SlipAlbumSourceId } from "@/features/slips/library-scan";
import { authClient } from "@/lib/auth-client";
import { getExistingLocalSlipUris, withLocalSlipImages } from "@/lib/local-slip-assets";
import type { Category } from "@/types/finance";
import { client, orpc, queryClient } from "@/utils/orpc";

export interface AutoScanCallbacks {
  onStart?: (info: { totalDays: number; totalSlips: number }) => void;
  onDayStart?: (info: { date: string; dayIndex: number; totalDays: number; count: number }) => void;
  onDayComplete?: (info: { date: string; importedCount: number }) => void;
  onComplete?: (info: { totalImported: number }) => void;
  onError?: (error: Error) => void;
}

interface ScannedSlipItem {
  id: string;
  source: SlipAlbumSourceId;
  creationTime: number;
  dateKey: string;
}

let isScanningActive = false;

function toDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function invalidateFinanceQueries() {
  await queryClient.invalidateQueries({ queryKey: orpc.ledger.listTransactions.queryKey() });
}

export const AUTO_SCAN_LOOKBACK_DAYS = 30;

/**
 * Automatically scans bank albums for slips in the past 30 days,
 * groups them by day, sends to Gemini 3.5 Flash Lite, and progressively
 * persists transactions to the database.
 */
export async function scanAndProcessNewSlips(callbacks: AutoScanCallbacks = {}): Promise<{ totalImported: number }> {
  if (isScanningActive) {
    return { totalImported: 0 };
  }

  isScanningActive = true;
  try {
    const permission = await getPermissionsAsync(false, ["photo"]);
    const status = accessStatus(permission);
    if (status !== "all" && status !== "limited") {
      return { totalImported: 0 };
    }

    const session = await authClient.getSession();
    const userId = session.data?.user?.id || "";
    if (!userId) {
      return { totalImported: 0 };
    }

    const transactions = await client.ledger.listTransactions({ limit: 1000 });

    const existingUris = await getExistingLocalSlipUris(userId);
    const existingTransactions = await withLocalSlipImages(userId, transactions || []);
    const existingDedupeKeys = new Set(
      existingTransactions.map((tx) => tx.dedupeKey).filter((key): key is string => Boolean(key))
    );

    // 1. Find matched bank albums
    const albums = await Album.getAll();
    const matchedAlbums = (
      await Promise.all(
        albums.map(async (album) => ({
          album,
          source: sourceForAlbum(await album.getTitle()),
        }))
      )
    ).filter((item): item is { album: Album; source: SlipAlbumSourceId } => item.source !== null);

    if (matchedAlbums.length === 0) {
      return { totalImported: 0 };
    }

    // 2. Query slips from past 30 days with pagination
    const now = Date.now();
    const cutoff = now - AUTO_SCAN_LOOKBACK_DAYS * dayInMilliseconds;
    const rawSlips: ScannedSlipItem[] = [];
    const seenScannedIds = new Set<string>();

    for (const { album, source } of matchedAlbums) {
      const pageSize = 200;
      let offset = 0;
      while (true) {
        const assets = await new Query()
          .album(album)
          .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
          .gte(AssetField.CREATION_TIME, cutoff)
          .lte(AssetField.CREATION_TIME, now)
          .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
          .limit(pageSize)
          .offset(offset)
          .exeForMetadata();

        for (const asset of assets) {
          if (!asset.id || seenScannedIds.has(asset.id)) continue;
          seenScannedIds.add(asset.id);

          const dedupe = `slip:${asset.id}`;
          // Skip if already imported
          if (existingDedupeKeys.has(dedupe) || existingUris.has(asset.id)) {
            continue;
          }
          const creationTime = asset.creationTime ?? now;
          rawSlips.push({
            id: asset.id,
            source,
            creationTime,
            dateKey: toDateKey(creationTime),
          });
        }

        if (assets.length < pageSize) break;
        offset += pageSize;
      }
    }

    if (rawSlips.length === 0) {
      return { totalImported: 0 };
    }

    // 3. Group by day (sorted descending: newest day first)
    const dayMap = new Map<string, ScannedSlipItem[]>();
    for (const slip of rawSlips) {
      const list = dayMap.get(slip.dateKey) ?? [];
      list.push(slip);
      dayMap.set(slip.dateKey, list);
    }

    const sortedDays = Array.from(dayMap.keys()).sort((a, b) => b.localeCompare(a));
    const totalSlips = rawSlips.length;

    callbacks.onStart?.({ totalDays: sortedDays.length, totalSlips });

    let categories: Category[] = [];
    try {
      categories = await client.ledger.listCategories({});
    } catch {
      // categories can fallback to empty
    }

    let totalImported = 0;

    // 4. Process day by day
    for (let i = 0; i < sortedDays.length; i++) {
      const date = sortedDays[i];
      const daySlips = dayMap.get(date) ?? [];

      callbacks.onDayStart?.({
        date,
        dayIndex: i,
        totalDays: sortedDays.length,
        count: daySlips.length,
      });

      const results = await Promise.all(
        daySlips.map(async (slipItem) => {
          try {
            const asset = new Asset(slipItem.id);
            const uri = await asset.getUri();
            if (existingUris.has(uri) || existingUris.has(slipItem.id)) return null;

            // Resize for optimal AI latency
            const manipulated = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1000 } }], {
              compress: 0.85,
              format: ImageManipulator.SaveFormat.JPEG,
            });

            const result = await requestImport(
              "slip",
              { uri: manipulated.uri, mimeType: "image/jpeg" },
              undefined,
              "gemini-3.5-flash-lite"
            );

            const cand = result.candidates[0];
            if (cand && typeof cand.amountSatang === "number" && cand.occurredOn) {
              const suggestedCategory = suggestCategory(
                cand.title || "",
                cand.kind ?? "expense",
                categories,
                existingTransactions
              );

              await client.ledger.createTransaction({
                kind: cand.kind ?? "expense",
                amountSatang: cand.amountSatang,
                occurredOn: cand.occurredOn,
                title: cand.title || "รายการจากสลิป",
                bank: cand.bank ?? null,
                cardName: cand.cardName ?? null,
                cardLast4: cand.cardLast4 ?? null,
                source: "slip",
                categoryId: suggestedCategory,
                slipImageUri: uri,
                dedupeKey: `slip:${slipItem.id}`,
              });

              existingUris.add(uri);
              existingUris.add(slipItem.id);
              existingDedupeKeys.add(`slip:${slipItem.id}`);
              return true;
            }
            return null;
          } catch (slipErr) {
            console.warn(`[auto-batch-scanner] Failed to process slip ${slipItem.id}:`, slipErr);
            return null;
          }
        })
      );

      const dayImported = results.filter(Boolean).length;
      totalImported += dayImported;

      // Immediately invalidate queries for progressive UI update after each day
      if (dayImported > 0) {
        void invalidateFinanceQueries();
      }

      callbacks.onDayComplete?.({ date, importedCount: dayImported });
    }

    if (totalImported > 0) {
      void invalidateFinanceQueries();
    }

    callbacks.onComplete?.({ totalImported });
    return { totalImported };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    callbacks.onError?.(error);
    return { totalImported: 0 };
  } finally {
    isScanningActive = false;
  }
}
