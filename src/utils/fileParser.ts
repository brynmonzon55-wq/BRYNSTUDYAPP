import JSZip from 'jszip';

export interface ParsedDocument {
  fileName: string;
  fileSize: number;
  text: string;
  suggestedTitle: string;
  suggestedTags: string[];
}

export async function parseUploadedDocument(file: File): Promise<ParsedDocument> {
  const fileName = file.name;
  const fileSize = file.size;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  let rawText = '';

  if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
    rawText = await file.text();
  } else if (ext === 'docx') {
    rawText = await parseDocxFile(file);
  } else if (ext === 'pptx') {
    rawText = await parsePptxFile(file);
  } else if (ext === 'pdf') {
    rawText = await parsePdfFile(file);
  } else {
    // Fallback: try reading as plain text
    try {
      rawText = await file.text();
    } catch {
      throw new Error(`Unsupported file format .${ext}. Please upload a .pdf, .docx, .pptx, .md, or .txt file.`);
    }
  }

  // Clean and normalize text
  const cleanText = cleanExtractedText(rawText);

  // Derive suggested title and tags
  const { suggestedTitle, suggestedTags } = deriveMetadataFromText(fileName, cleanText);

  return {
    fileName,
    fileSize,
    text: cleanText,
    suggestedTitle,
    suggestedTags,
  };
}

async function parseDocxFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = await zip.file('word/document.xml')?.async('text');

    if (!docXml) {
      throw new Error('Invalid Word document: word/document.xml not found.');
    }

    // Extract text from <w:t> tags
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXml, 'application/xml');
    const textNodes = xmlDoc.getElementsByTagName('w:t');
    const pNodes = xmlDoc.getElementsByTagName('w:p');

    const paragraphs: string[] = [];
    for (let i = 0; i < pNodes.length; i++) {
      const p = pNodes[i];
      const texts = Array.from(p.getElementsByTagName('w:t'))
        .map((node) => node.textContent || '')
        .join('');
      if (texts.trim()) {
        paragraphs.push(texts.trim());
      }
    }

    return paragraphs.join('\n\n');
  } catch (err: any) {
    console.error('DOCX parse error:', err);
    throw new Error(`Failed to extract text from Word document: ${err.message}`);
  }
}

async function parsePptxFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find all slide XML files
    const slideEntries: { name: string; slideNum: number }[] = [];
    zip.forEach((relativePath) => {
      const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
      if (match) {
        slideEntries.push({ name: relativePath, slideNum: parseInt(match[1], 10) });
      }
    });

    slideEntries.sort((a, b) => a.slideNum - b.slideNum);

    const parser = new DOMParser();
    const slidesText: string[] = [];

    for (const slide of slideEntries) {
      const slideXml = await zip.file(slide.name)?.async('text');
      if (!slideXml) continue;

      const xmlDoc = parser.parseFromString(slideXml, 'application/xml');
      const textNodes = xmlDoc.getElementsByTagName('a:t');
      const slideLines: string[] = [];

      for (let i = 0; i < textNodes.length; i++) {
        const txt = textNodes[i].textContent?.trim();
        if (txt) {
          slideLines.push(txt);
        }
      }

      if (slideLines.length > 0) {
        slidesText.push(`Slide ${slide.slideNum}:\n${slideLines.join(' ')}`);
      }
    }

    return slidesText.join('\n\n');
  } catch (err: any) {
    console.error('PPTX parse error:', err);
    throw new Error(`Failed to extract slides from PowerPoint presentation: ${err.message}`);
  }
}

async function parsePdfFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(bytes);

    // Extract text strings between BT (Begin Text) and ET (End Text) or Tj/TJ operators
    const textChunks: string[] = [];
    const regex = /\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const rawMatch = match[1] || match[2] || '';
      // Clean PDF escapes \( \) \r \n
      const cleaned = rawMatch
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\[0-9]{3}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length > 1) {
        textChunks.push(cleaned);
      }
    }

    if (textChunks.length > 0) {
      return textChunks.join(' ');
    }

    // Fallback: extract ASCII words if regex was sparse
    const words = content.match(/[A-Za-z0-9,.:;'"?!()\-]{3,}/g) || [];
    const filtered = words.filter((w) => !w.startsWith('obj') && !w.startsWith('endobj') && !w.startsWith('stream'));
    return filtered.slice(0, 500).join(' ');
  } catch (err: any) {
    console.error('PDF parse error:', err);
    throw new Error(`Unable to read PDF file content: ${err.message}`);
  }
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function deriveMetadataFromText(fileName: string, text: string): { suggestedTitle: string; suggestedTags: string[] } {
  // Title derivation:
  // 1. Look for markdown header # Title
  const headerMatch = text.match(/^#\s+([^\n]+)/m);
  let title = '';
  if (headerMatch && headerMatch[1]) {
    title = headerMatch[1].trim();
  }

  // 2. If no header, check first non-empty line
  if (!title) {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 3 && l.length < 80);
    if (lines.length > 0) {
      title = lines[0].replace(/^Slide \d+:\s*/i, '');
    }
  }

  // 3. Fallback: filename formatted nicely
  if (!title) {
    title = fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Derive potential tags
  const tags: string[] = [];
  const lower = text.toLowerCase();

  const domainKeywords: Record<string, string[]> = {
    Electronics: ['circuit', 'resistor', 'voltage', 'current', 'capacitor', 'ohm', 'diode'],
    Physics: ['quantum', 'velocity', 'force', 'energy', 'thermodynamics', 'gravity', 'momentum'],
    'Computer Science': ['algorithm', 'data structure', 'complexity', 'array', 'binary', 'tree', 'database'],
    Biology: ['cell', 'dna', 'rna', 'photosynthesis', 'protein', 'enzyme', 'organism'],
    Math: ['calculus', 'matrix', 'integral', 'derivative', 'linear algebra', 'probability', 'statistics'],
    Chemistry: ['molecule', 'reaction', 'acid', 'base', 'periodic', 'covalent', 'ionic'],
    Business: ['market', 'revenue', 'strategy', 'finance', 'roi', 'customer', 'product'],
  };

  for (const [tag, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      tags.push(tag);
      if (tags.length >= 3) break;
    }
  }

  return {
    suggestedTitle: title.slice(0, 70),
    suggestedTags: tags.length > 0 ? tags : ['Study Guide'],
  };
}
