import { XMLParser, XMLValidator } from "fast-xml-parser";

import type { Diagnostic, SourceLocation } from "@dredmorpedia/domain";

export type XmlRecord = Record<string, unknown>;
export type DiagnosticDraft = Omit<Diagnostic, "id">;

export interface XmlParseRequest {
  xml: string;
  sourceId: string;
  file: string;
}

export interface ParsedXml {
  document: XmlRecord;
  locateElement: (
    tag: string,
    name?: string,
    originalId?: string,
  ) => SourceLocation;
}

export type XmlParseResult =
  { ok: true; value: ParsedXml } | { ok: false; diagnostic: DiagnosticDraft };

const parser = new XMLParser({
  allowBooleanAttributes: false,
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  ignoreDeclaration: true,
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: false,
  trimValues: true,
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function attributeValue(tagText: string, name: string): string | undefined {
  const pattern = new RegExp(
    `(?:^|\\s)${escapeRegExp(name)}\\s*=\\s*(["'])(.*?)\\1`,
    "i",
  );
  return pattern.exec(tagText)?.[2];
}

function lineAndColumn(
  xml: string,
  offset: number,
): { line: number; column: number } {
  const before = xml.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

export function isXmlRecord(value: unknown): value is XmlRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function asXmlRecords(value: unknown): XmlRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isXmlRecord);
  }
  return isXmlRecord(value) ? [value] : [];
}

export function collectElements(document: unknown, tag: string): XmlRecord[] {
  const matches: XmlRecord[] = [];

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isXmlRecord(value)) {
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (key === tag) {
        for (const record of asXmlRecords(child)) {
          matches.push(record);
          visit(record);
        }
      } else {
        visit(child);
      }
    }
  }

  visit(document);
  return matches;
}

export interface NestedElement {
  record: XmlRecord;
  parentName?: string;
}

export function collectNestedElements(
  document: unknown,
  tag: string,
): NestedElement[] {
  const matches: NestedElement[] = [];

  function visit(value: unknown, parentName?: string): void {
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, parentName));
      return;
    }
    if (!isXmlRecord(value)) {
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (key === tag) {
        for (const record of asXmlRecords(child)) {
          matches.push({ record, ...(parentName ? { parentName } : {}) });
          const childName = xmlAttribute(record, "name") ?? parentName;
          visit(record, childName);
        }
      } else {
        visit(child, parentName);
      }
    }
  }

  visit(document);
  return matches;
}

export function xmlAttribute(
  record: XmlRecord,
  name: string,
): string | undefined {
  const value = record[`@${name}`];
  return typeof value === "string" ? value : undefined;
}

export function xmlChildren(record: XmlRecord, name: string): XmlRecord[] {
  return asXmlRecords(record[name]);
}

export function parseXml(request: XmlParseRequest): XmlParseResult {
  const fallbackSource: SourceLocation = {
    sourceId: request.sourceId,
    file: request.file,
    line: 1,
    column: 1,
  };

  if (/<!DOCTYPE/i.test(request.xml)) {
    return {
      ok: false,
      diagnostic: {
        severity: "error",
        code: "disallowed_doctype",
        message: "DOCTYPE declarations are not allowed in imported XML.",
        source: fallbackSource,
      },
    };
  }

  const validation = XMLValidator.validate(request.xml, {
    allowBooleanAttributes: false,
  });
  if (validation !== true) {
    return {
      ok: false,
      diagnostic: {
        severity: "error",
        code: "invalid_xml",
        message: validation.err.msg,
        source: {
          ...fallbackSource,
          line: validation.err.line,
          column: validation.err.col,
        },
      },
    };
  }

  const document = parser.parse(request.xml) as unknown;
  if (!isXmlRecord(document)) {
    return {
      ok: false,
      diagnostic: {
        severity: "error",
        code: "invalid_xml_root",
        message: "The parsed XML document does not contain an object root.",
        source: fallbackSource,
      },
    };
  }

  return {
    ok: true,
    value: {
      document,
      locateElement(tag, name, originalId) {
        const pattern = new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>`, "gi");
        let firstMatch: RegExpExecArray | null = null;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(request.xml)) !== null) {
          firstMatch ??= match;
          const tagText = match[0];
          const matchesName = name && attributeValue(tagText, "name") === name;
          const matchesId =
            originalId && attributeValue(tagText, "id") === originalId;
          if (matchesName || matchesId) {
            const position = lineAndColumn(request.xml, match.index);
            return { ...fallbackSource, ...position };
          }
        }

        const position = firstMatch
          ? lineAndColumn(request.xml, firstMatch.index)
          : { line: 1, column: 1 };
        return { ...fallbackSource, ...position };
      },
    },
  };
}
