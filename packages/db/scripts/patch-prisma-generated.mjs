import { readFile, writeFile } from "node:fs/promises";

const generated = new URL("../prisma/generated/internal/", import.meta.url);
const names = ["DbNull", "JsonNull", "AnyNull"];

for (const file of ["prismaNamespace.ts", "prismaNamespaceBrowser.ts"]) {
  const url = new URL(file, generated);
  let source = await readFile(url, "utf8");

  for (const name of names) {
    const declaration = `export const ${name} = runtime.objectEnumValues.instances.${name}`;
    const annotated = `export const ${name}: object = runtime.objectEnumValues.instances.${name}`;
    if (source.includes(annotated)) continue;
    if (!source.includes(declaration)) {
      throw new Error(`Expected Prisma declaration missing: ${file} ${name}`);
    }
    source = source.replace(declaration, annotated);
  }

  await writeFile(url, source);
}
