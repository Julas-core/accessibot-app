import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { enhanceIssuesWithAI } from "./ai-service";
import type { AccessibilityIssue } from "./analyze";

const figmaToken = secret("FigmaToken");
const sketchToken = secret("SketchToken");
const adobeXDToken = secret("AdobeXDToken");

export interface DesignAnalyzeRequest {
  fileUrl?: string;
  fileId?: string;
  platform: "figma" | "sketch" | "adobe-xd";
  nodeIds?: string[]; // Specific components/frames to analyze
}

export interface ColorContrastIssue {
  foregroundColor: string;
  backgroundColor: string;
  contrastRatio: number;
  wcagLevel: "AA" | "AAA" | "fail";
  recommendation: string;
  elementName?: string;
  elementId?: string;
}

export interface DesignAccessibilityIssue extends AccessibilityIssue {
  nodeId?: string;
  nodeName?: string;
  colorContrast?: ColorContrastIssue;
  designPlatform: "figma" | "sketch" | "adobe-xd";
  exportUrl?: string;
}

export interface DesignAnalyzeResponse {
  issues: DesignAccessibilityIssue[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
    colorContrastIssues: number;
    componentIssues: number;
  };
  fileInfo: {
    name: string;
    platform: string;
    lastModified?: Date;
    thumbnailUrl?: string;
  };
}

export interface FigmaFile {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  document: {
    children: FigmaNode[];
  };
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  fills?: FigmaFill[];
  strokes?: FigmaStroke[];
  backgroundColor?: FigmaColor;
  characters?: string;
  style?: FigmaTextStyle;
  componentPropertyDefinitions?: any;
  constraints?: any;
  exportSettings?: any[];
}

export interface FigmaFill {
  type: string;
  color?: FigmaColor;
  visible?: boolean;
}

export interface FigmaStroke {
  type: string;
  color?: FigmaColor;
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaTextStyle {
  fontSize?: number;
  fontWeight?: number;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
}

// Analyzes design files for accessibility issues before development.
export const analyzeDesignFile = api<DesignAnalyzeRequest, DesignAnalyzeResponse>(
  { expose: true, method: "POST", path: "/design/analyze" },
  async (req) => {
    if (!req.fileUrl && !req.fileId) {
      throw APIError.invalidArgument("Either fileUrl or fileId must be provided");
    }

    try {
      let fileData: any;
      let fileInfo: any;

      switch (req.platform) {
        case "figma":
          ({ fileData, fileInfo } = await fetchFigmaFile(req.fileUrl, req.fileId));
          break;
        case "sketch":
          ({ fileData, fileInfo } = await fetchSketchFile(req.fileUrl, req.fileId));
          break;
        case "adobe-xd":
          ({ fileData, fileInfo } = await fetchAdobeXDFile(req.fileUrl, req.fileId));
          break;
        default:
          throw APIError.invalidArgument(`Unsupported platform: ${req.platform}`);
      }

      const issues = await analyzeDesignForAccessibility(fileData, req.platform, req.nodeIds);
      
      // Enhance issues with AI suggestions
      try {
        await enhanceIssuesWithAI(issues);
      } catch (error) {
        console.warn('Failed to enhance design issues with AI, using default fixes:', error);
      }

      const summary = {
        total: issues.length,
        high: issues.filter(i => i.severity === "high").length,
        medium: issues.filter(i => i.severity === "medium").length,
        low: issues.filter(i => i.severity === "low").length,
        colorContrastIssues: issues.filter(i => i.colorContrast).length,
        componentIssues: issues.filter(i => i.type.includes('component')).length,
      };

      return { 
        issues, 
        summary,
        fileInfo: {
          name: fileInfo.name,
          platform: req.platform,
          lastModified: fileInfo.lastModified,
          thumbnailUrl: fileInfo.thumbnailUrl,
        }
      };
    } catch (error) {
      console.error("Design analysis error:", error);
      throw APIError.internal(`Failed to analyze design file: ${error}`);
    }
  }
);

async function fetchFigmaFile(fileUrl?: string, fileId?: string): Promise<{ fileData: FigmaFile; fileInfo: any }> {
  const token = figmaToken();
  if (!token || token.trim() === "") {
    // Demo mode: return mock Figma file data
    console.log("Figma demo mode active - returning mock file data");
    return {
      fileData: createMockFigmaFile(),
      fileInfo: {
        name: "Demo Design System",
        lastModified: new Date(),
        thumbnailUrl: "https://via.placeholder.com/300x200/f0f0f0/666?text=Figma+Demo"
      }
    };
  }

  let extractedFileId = fileId;
  if (fileUrl && !fileId) {
    const match = fileUrl.match(/\/file\/([a-zA-Z0-9]+)/);
    if (!match) {
      throw new Error("Invalid Figma file URL");
    }
    extractedFileId = match[1];
  }

  if (!extractedFileId) {
    throw new Error("Could not extract file ID from URL");
  }

  try {
    const response = await fetch(`https://api.figma.com/v1/files/${extractedFileId}`, {
      headers: {
        'X-Figma-Token': token,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      fileData: data,
      fileInfo: {
        name: data.name,
        lastModified: new Date(data.lastModified),
        thumbnailUrl: data.thumbnailUrl,
      }
    };
  } catch (error) {
    console.error("Failed to fetch Figma file:", error);
    throw error;
  }
}

async function fetchSketchFile(fileUrl?: string, fileId?: string): Promise<{ fileData: any; fileInfo: any }> {
  const token = sketchToken();
  if (!token || token.trim() === "") {
    // Demo mode: return mock Sketch file data
    console.log("Sketch demo mode active - returning mock file data");
    return {
      fileData: createMockSketchFile(),
      fileInfo: {
        name: "Demo App Design",
        lastModified: new Date(),
        thumbnailUrl: "https://via.placeholder.com/300x200/f5f5f5/666?text=Sketch+Demo"
      }
    };
  }

  // Sketch Cloud API implementation would go here
  // For now, return demo data
  return {
    fileData: createMockSketchFile(),
    fileInfo: {
      name: "Sketch Design File",
      lastModified: new Date(),
      thumbnailUrl: "https://via.placeholder.com/300x200/f5f5f5/666?text=Sketch"
    }
  };
}

async function fetchAdobeXDFile(fileUrl?: string, fileId?: string): Promise<{ fileData: any; fileInfo: any }> {
  const token = adobeXDToken();
  if (!token || token.trim() === "") {
    // Demo mode: return mock Adobe XD file data
    console.log("Adobe XD demo mode active - returning mock file data");
    return {
      fileData: createMockAdobeXDFile(),
      fileInfo: {
        name: "Demo Mobile App",
        lastModified: new Date(),
        thumbnailUrl: "https://via.placeholder.com/300x200/e0e0e0/666?text=Adobe+XD+Demo"
      }
    };
  }

  // Adobe XD API implementation would go here
  // For now, return demo data
  return {
    fileData: createMockAdobeXDFile(),
    fileInfo: {
      name: "Adobe XD Design File",
      lastModified: new Date(),
      thumbnailUrl: "https://via.placeholder.com/300x200/e0e0e0/666?text=Adobe+XD"
    }
  };
}

function createMockFigmaFile(): FigmaFile {
  return {
    name: "Demo Design System",
    lastModified: new Date().toISOString(),
    thumbnailUrl: "https://via.placeholder.com/300x200/f0f0f0/666?text=Figma+Demo",
    document: {
      children: [
        {
          id: "1:1",
          name: "Primary Button",
          type: "COMPONENT",
          fills: [{ type: "SOLID", color: { r: 0.2, g: 0.4, b: 1.0, a: 1.0 } }],
          children: [
            {
              id: "1:2",
              name: "Button Text",
              type: "TEXT",
              characters: "Click me",
              fills: [{ type: "SOLID", color: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 } }],
              style: { fontSize: 14, fontWeight: 400 }
            }
          ]
        },
        {
          id: "2:1",
          name: "Input Field",
          type: "COMPONENT",
          fills: [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95, a: 1.0 } }],
          children: [
            {
              id: "2:2",
              name: "Placeholder Text",
              type: "TEXT",
              characters: "Enter your email",
              fills: [{ type: "SOLID", color: { r: 0.7, g: 0.7, b: 0.7, a: 1.0 } }],
              style: { fontSize: 12, fontWeight: 300 }
            }
          ]
        },
        {
          id: "3:1",
          name: "Low Contrast Alert",
          type: "FRAME",
          backgroundColor: { r: 0.9, g: 0.9, b: 0.9, a: 1.0 },
          children: [
            {
              id: "3:2",
              name: "Alert Text",
              type: "TEXT",
              characters: "This is an important message",
              fills: [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8, a: 1.0 } }],
              style: { fontSize: 14, fontWeight: 400 }
            }
          ]
        }
      ]
    }
  };
}

function createMockSketchFile(): any {
  return {
    name: "Demo App Design",
    pages: [
      {
        name: "Symbols",
        layers: [
          {
            id: "button-primary",
            name: "Primary Button",
            type: "Symbol",
            style: {
              fills: [{ color: "#3366FF" }],
              borders: []
            },
            layers: [
              {
                id: "button-text",
                name: "Button Text",
                type: "Text",
                attributedString: { string: "Click me" },
                style: { textColor: "#FFFFFF", fontSize: 14 }
              }
            ]
          }
        ]
      }
    ]
  };
}

function createMockAdobeXDFile(): any {
  return {
    name: "Demo Mobile App",
    artboards: [
      {
        id: "artboard-1",
        name: "Home Screen",
        children: [
          {
            id: "button-1",
            name: "CTA Button",
            type: "Rectangle",
            fill: { color: "#FF6B6B" },
            children: [
              {
                id: "button-text-1",
                name: "Button Label",
                type: "Text",
                text: "Get Started",
                style: { color: "#FFFFFF", fontSize: 16 }
              }
            ]
          }
        ]
      }
    ]
  };
}

async function analyzeDesignForAccessibility(
  fileData: any, 
  platform: "figma" | "sketch" | "adobe-xd",
  nodeIds?: string[]
): Promise<DesignAccessibilityIssue[]> {
  const issues: DesignAccessibilityIssue[] = [];

  switch (platform) {
    case "figma":
      analyzeFigmaFile(fileData, issues, nodeIds);
      break;
    case "sketch":
      analyzeSketchFile(fileData, issues, nodeIds);
      break;
    case "adobe-xd":
      analyzeAdobeXDFile(fileData, issues, nodeIds);
      break;
  }

  return issues;
}

function analyzeFigmaFile(fileData: FigmaFile, issues: DesignAccessibilityIssue[], nodeIds?: string[]): void {
  const analyzeNode = (node: FigmaNode, parentBackground?: FigmaColor): void => {
    // Skip if specific nodes requested and this isn't one of them
    if (nodeIds && nodeIds.length > 0 && !nodeIds.includes(node.id)) {
      return;
    }

    // Check for text elements with potential contrast issues
    if (node.type === "TEXT" && node.characters && node.fills && node.fills.length > 0) {
      const textFill = node.fills.find(f => f.type === "SOLID" && f.color);
      if (textFill && textFill.color && parentBackground) {
        const contrastRatio = calculateContrastRatio(textFill.color, parentBackground);
        const wcagLevel = getWCAGLevel(contrastRatio, node.style?.fontSize || 14);
        
        if (wcagLevel === "fail" || (wcagLevel !== "AAA" && contrastRatio < 4.5)) {
          issues.push({
            type: "color-contrast-insufficient",
            severity: contrastRatio < 3 ? "high" : "medium",
            description: `Text "${node.characters}" has insufficient color contrast`,
            element: `Text: "${node.characters}"`,
            line: undefined,
            fix: "Improve color contrast to meet WCAG guidelines",
            codeSnippet: `/* Recommended: Use colors with contrast ratio ≥ 4.5:1 */\ncolor: ${getRecommendedTextColor(parentBackground)};`,
            nodeId: node.id,
            nodeName: node.name,
            designPlatform: "figma",
            colorContrast: {
              foregroundColor: rgbToHex(textFill.color),
              backgroundColor: rgbToHex(parentBackground),
              contrastRatio: contrastRatio,
              wcagLevel: wcagLevel,
              recommendation: `Use ${getRecommendedTextColor(parentBackground)} for better contrast`,
              elementName: node.name,
              elementId: node.id,
            }
          });
        }
      }
    }

    // Check for components without proper naming
    if (node.type === "COMPONENT" && (!node.name || node.name.startsWith("Rectangle") || node.name.startsWith("Ellipse"))) {
      issues.push({
        type: "component-naming-missing",
        severity: "medium",
        description: `Component "${node.name}" lacks descriptive naming`,
        element: `Component: ${node.name}`,
        line: undefined,
        fix: "Add descriptive, semantic names to components for better accessibility",
        codeSnippet: `// Recommended component naming:\n// Instead of: "${node.name}"\n// Use: "PrimaryButton", "NavigationMenu", "UserProfileCard"`,
        nodeId: node.id,
        nodeName: node.name,
        designPlatform: "figma"
      });
    }

    // Check for interactive elements without sufficient size
    if ((node.type === "COMPONENT" || node.name.toLowerCase().includes("button")) && node.constraints) {
      // Assume minimum touch target size should be 44px (iOS) or 48dp (Android)
      const minSize = 44;
      // This is a simplified check - in reality you'd need the actual dimensions
      issues.push({
        type: "touch-target-size-small",
        severity: "medium",
        description: `Interactive element "${node.name}" may be too small for touch targets`,
        element: `Component: ${node.name}`,
        line: undefined,
        fix: "Ensure interactive elements are at least 44px × 44px",
        codeSnippet: `/* Recommended minimum touch target size */\nmin-width: 44px;\nmin-height: 44px;`,
        nodeId: node.id,
        nodeName: node.name,
        designPlatform: "figma"
      });
    }

    // Get background color for child elements
    let currentBackground = parentBackground;
    if (node.backgroundColor) {
      currentBackground = node.backgroundColor;
    } else if (node.fills && node.fills.length > 0) {
      const solidFill = node.fills.find(f => f.type === "SOLID" && f.color);
      if (solidFill && solidFill.color) {
        currentBackground = solidFill.color;
      }
    }

    // Recursively analyze children
    if (node.children) {
      node.children.forEach(child => analyzeNode(child, currentBackground));
    }
  };

  // Start analysis from document root
  if (fileData.document && fileData.document.children) {
    fileData.document.children.forEach(child => analyzeNode(child, { r: 1, g: 1, b: 1, a: 1 }));
  }
}

function analyzeSketchFile(fileData: any, issues: DesignAccessibilityIssue[], nodeIds?: string[]): void {
  // Simplified Sketch analysis
  if (fileData.pages) {
    fileData.pages.forEach((page: any) => {
      if (page.layers) {
        page.layers.forEach((layer: any) => {
          if (layer.type === "Text" && layer.style && layer.style.textColor) {
            // Check for contrast issues in Sketch format
            issues.push({
              type: "design-review-needed",
              severity: "low",
              description: `Text element "${layer.name}" should be reviewed for accessibility`,
              element: `Text: ${layer.attributedString?.string || layer.name}`,
              line: undefined,
              fix: "Review text contrast and readability in Sketch",
              codeSnippet: `/* Review this text element for:\n- Color contrast\n- Font size\n- Font weight */`,
              nodeId: layer.id,
              nodeName: layer.name,
              designPlatform: "sketch"
            });
          }
        });
      }
    });
  }
}

function analyzeAdobeXDFile(fileData: any, issues: DesignAccessibilityIssue[], nodeIds?: string[]): void {
  // Simplified Adobe XD analysis
  if (fileData.artboards) {
    fileData.artboards.forEach((artboard: any) => {
      if (artboard.children) {
        artboard.children.forEach((element: any) => {
          if (element.type === "Text" && element.style) {
            issues.push({
              type: "design-review-needed",
              severity: "low",
              description: `Text element "${element.name}" should be reviewed for accessibility`,
              element: `Text: ${element.text || element.name}`,
              line: undefined,
              fix: "Review text accessibility in Adobe XD",
              codeSnippet: `/* Review this text element for:\n- Color contrast\n- Font size\n- Semantic meaning */`,
              nodeId: element.id,
              nodeName: element.name,
              designPlatform: "adobe-xd"
            });
          }
        });
      }
    });
  }
}

function calculateContrastRatio(foreground: FigmaColor, background: FigmaColor): number {
  const getLuminance = (color: FigmaColor): number => {
    const normalize = (channel: number): number => {
      const c = channel;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const r = normalize(color.r);
    const g = normalize(color.g);
    const b = normalize(color.b);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function getWCAGLevel(contrastRatio: number, fontSize: number): "AA" | "AAA" | "fail" {
  const isLargeText = fontSize >= 18 || fontSize >= 14; // Simplified check

  if (contrastRatio >= 7) return "AAA";
  if (contrastRatio >= 4.5) return "AA";
  if (isLargeText && contrastRatio >= 3) return "AA";
  return "fail";
}

function rgbToHex(color: FigmaColor): string {
  const toHex = (channel: number): string => {
    const hex = Math.round(channel * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function getRecommendedTextColor(backgroundColor: FigmaColor): string {
  const luminance = 0.2126 * backgroundColor.r + 0.7152 * backgroundColor.g + 0.0722 * backgroundColor.b;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

export interface DesignFileListResponse {
  files: DesignFileInfo[];
  platform: string;
}

export interface DesignFileInfo {
  id: string;
  name: string;
  thumbnailUrl?: string;
  lastModified?: Date;
  shareUrl?: string;
}

// Lists design files from connected platforms.
export const listDesignFiles = api<{ platform: string }, DesignFileListResponse>(
  { expose: true, method: "GET", path: "/design/files/:platform" },
  async ({ platform }) => {
    // Validate platform parameter
    if (platform !== "figma" && platform !== "sketch" && platform !== "adobe-xd") {
      throw APIError.invalidArgument(`Unsupported platform: ${platform}`);
    }

    try {
      switch (platform) {
        case "figma":
          return await listFigmaFiles();
        case "sketch":
          return await listSketchFiles();
        case "adobe-xd":
          return await listAdobeXDFiles();
        default:
          throw APIError.invalidArgument(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      console.error(`Failed to list ${platform} files:`, error);
      throw APIError.internal(`Failed to list design files: ${error}`);
    }
  }
);

async function listFigmaFiles(): Promise<DesignFileListResponse> {
  const token = figmaToken();
  if (!token || token.trim() === "") {
    // Demo mode: return mock files
    return {
      platform: "figma",
      files: [
        {
          id: "demo-1",
          name: "Design System Components",
          thumbnailUrl: "https://via.placeholder.com/300x200/f0f0f0/666?text=Design+System",
          lastModified: new Date(),
          shareUrl: "https://figma.com/file/demo-1"
        },
        {
          id: "demo-2", 
          name: "Mobile App Screens",
          thumbnailUrl: "https://via.placeholder.com/300x200/e8f4fd/666?text=Mobile+App",
          lastModified: new Date(),
          shareUrl: "https://figma.com/file/demo-2"
        },
        {
          id: "demo-3",
          name: "Web Dashboard",
          thumbnailUrl: "https://via.placeholder.com/300x200/f9f1e6/666?text=Dashboard",
          lastModified: new Date(),
          shareUrl: "https://figma.com/file/demo-3"
        }
      ]
    };
  }

  try {
    const response = await fetch("https://api.figma.com/v1/files/recent", {
      headers: {
        'X-Figma-Token': token,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    const files: DesignFileInfo[] = data.files.map((file: any) => ({
      id: file.key,
      name: file.name,
      thumbnailUrl: file.thumbnail_url,
      lastModified: new Date(file.last_modified),
      shareUrl: `https://figma.com/file/${file.key}`
    }));

    return { platform: "figma", files };
  } catch (error) {
    console.error("Failed to fetch Figma files:", error);
    throw error;
  }
}

async function listSketchFiles(): Promise<DesignFileListResponse> {
  // Mock Sketch files for demo
  return {
    platform: "sketch",
    files: [
      {
        id: "sketch-demo-1",
        name: "UI Kit Components",
        thumbnailUrl: "https://via.placeholder.com/300x200/f5f5f5/666?text=UI+Kit",
        lastModified: new Date(),
        shareUrl: "https://sketch.com/s/demo-1"
      },
      {
        id: "sketch-demo-2",
        name: "Icon Library",
        thumbnailUrl: "https://via.placeholder.com/300x200/fef7f0/666?text=Icons",
        lastModified: new Date(),
        shareUrl: "https://sketch.com/s/demo-2"
      }
    ]
  };
}

async function listAdobeXDFiles(): Promise<DesignFileListResponse> {
  // Mock Adobe XD files for demo
  return {
    platform: "adobe-xd",
    files: [
      {
        id: "xd-demo-1",
        name: "Prototype Flows",
        thumbnailUrl: "https://via.placeholder.com/300x200/e0e0e0/666?text=Prototype",
        lastModified: new Date(),
        shareUrl: "https://xd.adobe.com/view/demo-1"
      },
      {
        id: "xd-demo-2",
        name: "Style Guide",
        thumbnailUrl: "https://via.placeholder.com/300x200/f0f8ff/666?text=Style+Guide",
        lastModified: new Date(),
        shareUrl: "https://xd.adobe.com/view/demo-2"
      }
    ]
  };
}
