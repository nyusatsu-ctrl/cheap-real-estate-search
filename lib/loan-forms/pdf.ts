import { promises as fs } from "fs";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { LoanFormConfig, LoanFormInput } from "./types";
import { loanFormFieldOrder } from "./types";
import { publicPathToFilePath } from "./config";

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const FALLBACK_FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function pxToPt(value: number, dpi: number) {
  return (value / dpi) * 72;
}

function getPageSize(config: LoanFormConfig) {
  return config.page.orientation === "landscape"
    ? { width: A4_HEIGHT_PT, height: A4_WIDTH_PT }
    : { width: A4_WIDTH_PT, height: A4_HEIGHT_PT };
}

function getPdfPointFromImageTopLeft(config: LoanFormConfig, pageHeightPt: number, xPx: number, yPx: number) {
  const dpi = config.page.dpi;
  return {
    x: pxToPt(xPx, dpi),
    y: pageHeightPt - pxToPt(yPx, dpi)
  };
}

function wrapText(text: string, font: { widthOfTextAtSize: (text: string, size: number) => number }, fontSize: number, maxWidthPt?: number) {
  if (!maxWidthPt || font.widthOfTextAtSize(text, fontSize) <= maxWidthPt) {
    return [text];
  }

  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    const candidate = current + char;
    if (font.widthOfTextAtSize(candidate, fontSize) > maxWidthPt && current) {
      lines.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    if (digits.startsWith("03") || digits.startsWith("06")) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

function normalizeFieldValue(key: string, value: string) {
  if (["phone", "mobile", "workPhone"].includes(key)) {
    return formatPhoneNumber(value);
  }
  if (key === "age") {
    return value.replace(/歳/g, "").trim();
  }
  if (key === "yearsEmployed") {
    return value.replace(/\D/g, "").trim();
  }
  if (key === "payday") {
    if (value.indexOf("月末") !== -1) {
      return "月末";
    }
    return value.replace(/\D/g, "").trim();
  }
  if (key === "annualIncome") {
    return value.replace(/万円/g, "").trim();
  }
  return value;
}

export async function createLoanFormPdf(config: LoanFormConfig, input: Partial<LoanFormInput>) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const pageSize = getPageSize(config);
  const page = pdfDoc.addPage([pageSize.width, pageSize.height]);
  const templateBytes = await fs.readFile(publicPathToFilePath(config.templateImage));
  const templateImage = await pdfDoc.embedPng(templateBytes);
  const templateHeight = templateImage.height;
  const templateHeightPt = pxToPt(templateHeight, config.page.dpi);
  page.drawImage(templateImage, {
    x: 0,
    y: 0,
    width: pageSize.width,
    height: pageSize.height
  });

  for (const whiteout of config.whiteouts || []) {
    const point = getPdfPointFromImageTopLeft(config, templateHeightPt, whiteout.x + config.page.offsetX, whiteout.y + config.page.offsetY);
    page.drawRectangle({
      x: point.x,
      y: point.y - pxToPt(whiteout.height, config.page.dpi),
      width: pxToPt(whiteout.width, config.page.dpi),
      height: pxToPt(whiteout.height, config.page.dpi),
      color: rgb(1, 1, 1)
    });
  }

  const fontBytes = await fs.readFile(FALLBACK_FONT_PATH);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const color = hexToRgb(config.defaults.fontColor);
  const dpi = config.page.dpi;

  for (const key of loanFormFieldOrder) {
    const value = normalizeFieldValue(key, String(input[key] || "").trim());
    if (!value) continue;

    const field = config.fields[key];
    if (!field) continue;

    const fontSize = pxToPt(field.fontSize || config.defaults.fontSize, dpi);
    const point = getPdfPointFromImageTopLeft(config, templateHeightPt, field.x + config.page.offsetX, field.y + config.page.offsetY);
    const maxWidthPt = field.maxWidth ? pxToPt(field.maxWidth, dpi) : undefined;
    const lines = wrapText(value, font, fontSize, maxWidthPt);

    if (field.backgroundWhite) {
      page.drawRectangle({
        x: point.x - pxToPt(6, dpi),
        y: point.y - fontSize * 0.25,
        width: maxWidthPt || font.widthOfTextAtSize(value, fontSize) + pxToPt(12, dpi),
        height: fontSize * 1.45,
        color: rgb(1, 1, 1)
      });
    }

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: point.x,
        y: point.y - index * fontSize * 1.25,
        size: fontSize,
        font,
        color
      });
    });
  }

  pdfDoc.setTitle(`${config.label}申込書`);
  pdfDoc.setCreator("自社ローン審査管理");
  return pdfDoc.save();
}
