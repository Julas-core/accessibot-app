import { api, APIError } from "encore.dev/api";
import * as cheerio from "cheerio";
import { enhanceIssuesWithAI } from "./ai-service";

export interface AnalyzeRequest {
  url?: string;
  html?: string;
}

export interface AccessibilityIssue {
  type: string;
  severity: "high" | "medium" | "low";
  description: string;
  element: string;
  line?: number;
  fix: string;
  codeSnippet: string;
}

export interface AnalyzeResponse {
  issues: AccessibilityIssue[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Analyzes HTML content for accessibility issues and generates AI-powered fixes.
export const analyze = api<AnalyzeRequest, AnalyzeResponse>(
  { expose: true, method: "POST", path: "/analyze" },
  async (req) => {
    let htmlContent: string;

    if (req.url) {
      try {
        const response = await fetch(req.url);
        if (!response.ok) {
          throw APIError.invalidArgument(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        htmlContent = await response.text();
      } catch (error) {
        if (error instanceof APIError) {
          throw error;
        }
        throw APIError.invalidArgument(`Failed to fetch URL: ${error}`);
      }
    } else if (req.html) {
      htmlContent = req.html;
    } else {
      throw APIError.invalidArgument("Either URL or HTML content must be provided");
    }

    try {
      const issues = await analyzeHTML(htmlContent);
      const summary = {
        total: issues.length,
        high: issues.filter(i => i.severity === "high").length,
        medium: issues.filter(i => i.severity === "medium").length,
        low: issues.filter(i => i.severity === "low").length,
      };

      return { issues, summary };
    } catch (error) {
      console.error("Analysis error:", error);
      throw APIError.internal(`Failed to analyze HTML content: ${error}`);
    }
  }
);

async function analyzeHTML(html: string): Promise<AccessibilityIssue[]> {
  let $: cheerio.CheerioAPI;
  
  try {
    $ = cheerio.load(html);
  } catch (error) {
    throw new Error(`Failed to parse HTML: ${error}`);
  }

  const issues: AccessibilityIssue[] = [];

  // Check for images without alt text
  $('img').each((index, element) => {
    const $img = $(element);
    const alt = $img.attr('alt');
    const src = $img.attr('src') || 'unknown';
    
    if (!alt || alt.trim() === '') {
      issues.push({
        type: "missing-alt-text",
        severity: "high",
        description: `Image missing alt text: ${src}`,
        element: $.html($img) || '',
        fix: "Add descriptive alt text to the image",
        codeSnippet: `<img src="${src}" alt="Descriptive text about the image" />`
      });
    }
  });

  // Check for non-descriptive link text
  $('a').each((index, element) => {
    const $link = $(element);
    const text = $link.text().trim().toLowerCase();
    const href = $link.attr('href') || '';
    
    const nonDescriptiveTexts = ['click here', 'read more', 'here', 'more', 'link'];
    if (nonDescriptiveTexts.includes(text) || text.length < 3) {
      issues.push({
        type: "non-descriptive-link",
        severity: "medium",
        description: `Non-descriptive link text: "${text}"`,
        element: $.html($link) || '',
        fix: "Use descriptive link text that explains the destination or purpose",
        codeSnippet: `<a href="${href}">Descriptive link text about the destination</a>`
      });
    }
  });

  // Check for missing form labels
  $('input, select, textarea').each((index, element) => {
    const $input = $(element);
    const id = $input.attr('id');
    const type = $input.attr('type');
    const name = $input.attr('name') || 'input';
    
    // Skip hidden inputs and buttons
    if (type === 'hidden' || type === 'submit' || type === 'button') return;
    
    const hasLabel = id && $(`label[for="${id}"]`).length > 0;
    const hasAriaLabel = $input.attr('aria-label');
    const hasAriaLabelledby = $input.attr('aria-labelledby');
    
    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby) {
      const inputId = id || name;
      issues.push({
        type: "missing-form-label",
        severity: "high",
        description: `Form input missing label: ${name}`,
        element: $.html($input) || '',
        fix: "Add a label element or aria-label attribute",
        codeSnippet: `<label for="${inputId}">${name.charAt(0).toUpperCase() + name.slice(1)}:</label>\n<input id="${inputId}" name="${name}" type="${type || 'text'}" />`
      });
    }
  });

  // Check for missing heading hierarchy
  const headings = $('h1, h2, h3, h4, h5, h6').toArray();
  let lastLevel = 0;
  
  headings.forEach((heading) => {
    const $heading = $(heading);
    const level = parseInt(heading.tagName.substring(1));
    
    if (level > lastLevel + 1) {
      issues.push({
        type: "heading-hierarchy",
        severity: "medium",
        description: `Heading hierarchy skipped from h${lastLevel} to h${level}`,
        element: $.html($heading) || '',
        fix: "Use proper heading hierarchy without skipping levels",
        codeSnippet: `<h${lastLevel + 1}>${$heading.text()}</h${lastLevel + 1}>`
      });
    }
    
    lastLevel = level;
  });

  // Check for missing page title
  const title = $('title').text().trim();
  if (!title || title.length < 3) {
    issues.push({
      type: "missing-page-title",
      severity: "high",
      description: "Page missing or has inadequate title",
      element: title ? `<title>${title}</title>` : "<title></title>",
      fix: "Add a descriptive page title",
      codeSnippet: "<title>Descriptive Page Title</title>"
    });
  }

  // Check for missing lang attribute
  const htmlLang = $('html').attr('lang');
  if (!htmlLang) {
    issues.push({
      type: "missing-lang-attribute",
      severity: "medium",
      description: "HTML element missing lang attribute",
      element: "<html>",
      fix: "Add lang attribute to specify the page language",
      codeSnippet: '<html lang="en">'
    });
  }

  // Generate AI-powered improvements for each issue using the new caching system
  try {
    await enhanceIssuesWithAI(issues);
  } catch (error) {
    console.warn('Failed to enhance issues with AI, using default fixes:', error);
    // Continue without AI enhancements - the default fixes are already set
  }

  return issues;
}
