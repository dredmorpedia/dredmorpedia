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
  locateRecord: (record: XmlRecord) => SourceLocation;
  locateChildElement: (record: XmlRecord, tag: string) => SourceLocation;
}

export type XmlParseResult =
  { ok: true; value: ParsedXml } | { ok: false; diagnostic: DiagnosticDraft };

const parser = new XMLParser({
  allowBooleanAttributes: false,
  attributeNamePrefix: "@",
  captureMetaData: true,
  ignoreAttributes: false,
  ignoreDeclaration: true,
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: false,
  trimValues: true,
});

const xmlMetadataSymbol = XMLParser.getMetaDataSymbol() as unknown as symbol;

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

function recordStartIndex(record: XmlRecord): number | undefined {
  const metadata = (record as unknown as Record<PropertyKey, unknown>)[
    xmlMetadataSymbol
  ];
  if (!isXmlRecord(metadata)) {
    return undefined;
  }

  const startIndex = metadata.startIndex;
  return typeof startIndex === "number" &&
    Number.isInteger(startIndex) &&
    startIndex >= 0
    ? startIndex
    : undefined;
}

function findTagEnd(xml: string, start: number): number | undefined {
  let quote: '"' | "'" | null = null;

  for (let index = start + 1; index < xml.length; index += 1) {
    const character = xml[index];
    if (quote) {
      if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") {
      return index;
    }
  }

  return undefined;
}

function skipMarkup(
  xml: string,
  start: number,
  opening: string,
  closing: string,
): number | undefined {
  if (!xml.startsWith(opening, start)) {
    return undefined;
  }
  const end = xml.indexOf(closing, start + opening.length);
  return end < 0 ? xml.length : end + closing.length;
}

function directChildStartIndex(
  xml: string,
  parentStart: number,
  targetTag: string,
): number | undefined {
  const parentEnd = findTagEnd(xml, parentStart);
  if (
    parentEnd === undefined ||
    /\/\s*>$/.test(xml.slice(parentStart, parentEnd + 1))
  ) {
    return undefined;
  }

  let depth = 0;
  let cursor = parentEnd + 1;

  while (cursor < xml.length) {
    const start = xml.indexOf("<", cursor);
    if (start < 0) {
      return undefined;
    }

    const skipped =
      skipMarkup(xml, start, "<!--", "-->") ??
      skipMarkup(xml, start, "<![CDATA[", "]]>") ??
      skipMarkup(xml, start, "<?", "?>");
    if (skipped !== undefined) {
      cursor = skipped;
      continue;
    }

    const end = findTagEnd(xml, start);
    if (end === undefined) {
      return undefined;
    }
    const tagText = xml.slice(start, end + 1);

    if (/^<\s*\//.test(tagText)) {
      if (depth === 0) {
        return undefined;
      }
      depth -= 1;
      cursor = end + 1;
      continue;
    }

    if (/^<\s*!/.test(tagText)) {
      cursor = end + 1;
      continue;
    }

    const tagName = /^<\s*([^\s/>]+)/.exec(tagText)?.[1];
    if (depth === 0 && tagName === targetTag) {
      return start;
    }
    if (!/\/\s*>$/.test(tagText)) {
      depth += 1;
    }
    cursor = end + 1;
  }

  return undefined;
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
  const parsedXml = request.xml.replace(/\r\n?/g, "\n");
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

  const document = parser.parse(parsedXml) as unknown;
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
      locateRecord(record) {
        const startIndex = recordStartIndex(record);
        const position =
          startIndex === undefined
            ? { line: 1, column: 1 }
            : lineAndColumn(parsedXml, startIndex);
        return { ...fallbackSource, ...position };
      },
      locateChildElement(record, tag) {
        const parentStart = recordStartIndex(record);
        const childStart =
          parentStart === undefined
            ? undefined
            : directChildStartIndex(parsedXml, parentStart, tag);
        const position =
          childStart === undefined
            ? parentStart === undefined
              ? { line: 1, column: 1 }
              : lineAndColumn(parsedXml, parentStart)
            : lineAndColumn(parsedXml, childStart);
        return { ...fallbackSource, ...position };
      },
    },
  };
}
