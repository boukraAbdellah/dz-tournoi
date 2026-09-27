import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Detect available Chromium or Microsoft Edge binary on the local machine
 */
export function findChromiumPath(): string | undefined {
  if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }
  if (
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH &&
    fs.existsSync(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)
  ) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }

  // Windows common paths (Edge is present on every Windows 10/11)
  const candidatePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // Linux / Mac
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return undefined;
}

export interface PdfOptions {
  landscape?: boolean;
  format?: 'A4' | 'Letter';
}

/**
 * Render raw HTML into a print-ready PDF buffer using local Chromium / Edge
 */
export async function generatePdfFromHtml(
  htmlContent: string,
  options: PdfOptions = {},
): Promise<Buffer> {
  const executablePath = findChromiumPath();

  if (!executablePath) {
    throw new Error('Chromium/Edge browser executable not found on host machine for PDF generation.');
  }

  const randomId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tempHtmlPath = path.join(os.tmpdir(), `sport_doc_${randomId}.html`);
  const tempPdfPath = path.join(os.tmpdir(), `sport_doc_${randomId}.pdf`);

  // Ensure UTF-8 HTML file with proper HTML structure
  await fs.promises.writeFile(tempHtmlPath, htmlContent, 'utf-8');

  try {
    const args = [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-software-rasterizer',
      '--no-pdf-header-footer',
      `--print-to-pdf=${tempPdfPath}`,
      tempHtmlPath,
    ];

    await execFileAsync(executablePath, args, {
      timeout: 20000,
      windowsHide: true,
    });

    if (!fs.existsSync(tempPdfPath)) {
      throw new Error('Chromium exited without producing a PDF file.');
    }

    const pdfBuffer = await fs.promises.readFile(tempPdfPath);
    return pdfBuffer;
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempHtmlPath)) await fs.promises.unlink(tempHtmlPath);
    } catch {}
    try {
      if (fs.existsSync(tempPdfPath)) await fs.promises.unlink(tempPdfPath);
    } catch {}
  }
}
