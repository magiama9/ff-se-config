import type { Flatfile } from "@flatfile/api";
import { capitalCase } from "change-case";
import { generateField } from "./generateField";

export function generateSheets(
  graphQLObjects: { name: string; fields: any[]; description: string; }[],
  sheetConfigArray: any[]
): Flatfile.SheetConfig[] {
  return graphQLObjects
    .map((object: { name: string; fields: any[]; description: string; }) => {
      let sheetConfig =
        sheetConfigArray?.find((config: { slug: string; }) => config.slug === object.name) || {};

      const fields = object.fields
        .map((field) => generateField(field, object.name))
        .filter(Boolean);
      
        // Add an id field if it doesn't exist so we can guarantee it exists for lookups
        // ** Possible better usage is to change this to metadata or hidden **
      if (!fields.some((field) => field.key === "id")) {
        fields.unshift({ key: "id", label: "Id", type: "number" });
      }

      return fields.length
        ? {
            ...sheetConfig,
            name: capitalCase(object.name),
            fields,
            slug: object.name,
            description: object.description || "",
          }
        : null;
    })
    .filter(
      (sheet) =>
        sheet &&
        (!sheet.fields ||
          sheet.fields.every(
            (field: { type: string; config: { ref: any; }; }) =>
              field.type !== "reference" ||
              graphQLObjects.some((obj) => obj.name === field.config.ref)
          ))
    );
}
