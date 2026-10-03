import { describe, expect, it, vi } from "vite-plus/test";

import { queryState } from "./query-state";

type Query = Parameters<typeof queryState>[0][number];

const query = (state: Partial<Query> = {}): Query => ({
  data: undefined,
  error: null,
  isFetching: false,
  isEnabled: true,
  refetch: vi.fn(),
  ...state,
});
const loaded = (state: Partial<Query> = {}) => query({ data: [], ...state });
const failed = new Error("offline");

describe("queryState", () => {
  it("shows the page error when a query that never loaded failed", () => {
    const state = queryState([loaded(), query({ error: failed }), query()]);
    expect(state).toMatchObject({ ready: false, pageError: true, refreshError: false });
  });

  it("keeps loading while queries without data have not failed", () => {
    const state = queryState([loaded({ error: failed }), query({ isFetching: true })]);
    expect(state).toMatchObject({ ready: false, pageError: false, refreshError: false });
  });

  it("is ready once every query has data, and shows a failed refresh over the loaded data", () => {
    expect(queryState([loaded(), loaded()])).toMatchObject({ ready: true, pageError: false, refreshError: false });
    expect(queryState([loaded(), loaded({ error: failed })])).toMatchObject({ ready: true, refreshError: true });
  });

  it("hides a failed refresh while that query fetches again", () => {
    const state = queryState([loaded({ error: failed, isFetching: true })]);
    expect(state.refreshError).toBe(false);
  });

  it("retries every enabled query and leaves disabled ones alone", () => {
    const enabled = query({ error: failed });
    const disabled = query({ isEnabled: false });
    queryState([enabled, disabled]).retry();
    expect(enabled.refetch).toHaveBeenCalledOnce();
    expect(disabled.refetch).not.toHaveBeenCalled();
  });
});
