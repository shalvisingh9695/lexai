import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

/**
 * Extracts text page-by-page from a PDF buffer using pdf-parse.
 * @param {Buffer} pdfBuffer 
 * @returns {Promise<{ pageCount: number, textLength: number, pages: Array<{page: number, text: string}> }>}
 */
export async function extractPdfText(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('EMPTY_PDF: Uploaded PDF file is empty.');
  }

  const pages = [];

  function customPageRender(pageData) {
    const renderOptions = {
      normalizeWhitespace: true,
      disableCombineTextItems: false
    };

    return pageData.getTextContent(renderOptions).then((textContent) => {
      let lastY, text = '';
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }

      // Clean excessive whitespace while keeping document wording intact
      const cleanedLines = text
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .filter((line) => line.length > 0);

      const cleanedText = cleanedLines.join('\n');

      const pageNum = pageData.pageNumber || (pageData.pageIndex + 1);
      pages.push({
        page: pageNum,
        text: cleanedText
      });

      return cleanedText;
    });
  }

  let pdfData;
  try {
    pdfData = await pdf(pdfBuffer, { pagerender: customPageRender });
  } catch (err) {
    throw new Error(`CORRUPTED_PDF: Unable to parse PDF. ${err.message || 'Corrupted file structure.'}`);
  }

  // Ensure pages are sorted by page number
  pages.sort((a, b) => a.page - b.page);

  const totalPageCount = pdfData.numpages || pages.length || 0;
  if (totalPageCount === 0) {
    throw new Error('EMPTY_PDF: PDF document has 0 pages.');
  }

  const totalTextLength = pages.reduce((acc, p) => acc + p.text.length, 0);

  if (totalTextLength === 0) {
    throw new Error('NO_TEXT_FOUND: PDF contains no extractable text.');
  }

  return {
    pageCount: totalPageCount,
    textLength: totalTextLength,
    pages
  };
}
