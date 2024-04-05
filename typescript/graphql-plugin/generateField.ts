import type { Flatfile } from "@flatfile/api";
import { capitalCase } from "change-case";

export function generateField(
  field: {
    name: string;
    description: string;
    type: { kind: string; name: string; ofType: any };
  },
  sheetName: string
): Flatfile.Property {
  const baseProperty = {
    key: field.name,
    label: capitalCase(field.name),
    description: field.description || "",
    constraints: field.type.kind === "NON_NULL" ? [{ type: "required" }] : [],
    multi: field.type.kind === "LIST" ? true : false,
  } as Flatfile.BaseProperty;

  if (field.type.kind === "SCALAR") {
    return { ...baseProperty, type: getType(field.type.name) };
  } else if (field.type.kind === "OBJECT") {
    return {
      ...baseProperty,
      type: "reference",
      config: { ref: field.type.name, key: "id", relationship: "has-one" },
    };
  } else if (field.type.kind === "LIST") {
    return {
      ...baseProperty,
      type: "string",
    };
  } else if (field.type.kind === "NON_NULL") {
    return generateField({ ...field, type: field.type.ofType }, sheetName);
  } else {
    console.log(
      `Field '${field.name}' on '${sheetName}' skipped because '${field.type.kind}' is unsupported.`
    );
    return null;
  }
}

function getType(scalar): "number" | "boolean" | "string" {
  switch (scalar) {
    case "Float":
    case "Int":
      return "number";
    case "Boolean":
      return "boolean";
    default:
      return "string";
  }
}
