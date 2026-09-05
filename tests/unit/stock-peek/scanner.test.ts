import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DOMScanner } from '../../../src/stock-peek/scanner';
import { StockDetector } from '../../../src/stock-peek/detector';
import { HoverCard } from '../../../src/stock-peek/hover-card';
import stockDictionary from '../../fixtures/stock-dictionary.json';

describe('DOMScanner', () => {
  let detector: StockDetector;
  let hoverCard: HoverCard;
  let scanner: DOMScanner;

  beforeEach(() => {
    detector = new StockDetector();
    detector.loadDictionary(stockDictionary as any);
    hoverCard = new HoverCard();
    scanner = new DOMScanner(detector, hoverCard, { maxNodesPerScan: 50 });
  });

  it('should successfully scan and replace text nodes containing detected stocks', () => {
    // 模擬 DOM Text Node 與 Parent Node
    const replacedNodes: any[] = [];
    const createdSpans: any[] = [];

    const mockTextNode = {
      textContent: '推 test: 今天 2330 台積電 買盤湧現漲停！',
      parentElement: {
        tagName: 'DIV',
        isContentEditable: false,
        classList: { contains: () => false },
        closest: () => null,
      },
      parentNode: {
        replaceChild: vi.fn((newChild, oldChild) => {
          replacedNodes.push({ newChild, oldChild });
        }),
      },
    };

    // 建立 mock document
    const originalDocument = (globalThis as any).document;
    const originalNodeFilter = (globalThis as any).NodeFilter;

    (globalThis as any).NodeFilter = {
      SHOW_TEXT: 4,
      FILTER_ACCEPT: 1,
      FILTER_REJECT: 2,
    };

    (globalThis as any).document = {
      createTreeWalker: vi.fn((_root, _whatToShow, filter) => {
        let done = false;
        return {
          nextNode: () => {
            if (!done) {
              done = true;
              const accepted = filter.acceptNode(mockTextNode);
              return accepted === 1 ? mockTextNode : null;
            }
            return null;
          },
        };
      }),
      createDocumentFragment: vi.fn(() => ({
        childNodes: [] as any[],
        appendChild: function (node: any) {
          this.childNodes.push(node);
        },
      })),
      createTextNode: vi.fn((text: string) => ({
        nodeType: 3,
        textContent: text,
      })),
      createElement: vi.fn((tag: string) => {
        const el = {
          tagName: tag.toUpperCase(),
          className: '',
          attributes: {} as Record<string, string>,
          setAttribute: function (k: string, v: string) {
            this.attributes[k] = v;
          },
          getAttribute: function (k: string) {
            return this.attributes[k];
          },
          textContent: '',
          addEventListener: vi.fn(),
        };
        createdSpans.push(el);
        return el;
      }),
      getElementById: vi.fn(() => null),
      head: { appendChild: vi.fn() },
      body: {},
    };

    try {
      const matchCount = scanner.scan({} as any);
      expect(matchCount).toBe(1);
      expect(mockTextNode.parentNode.replaceChild).toHaveBeenCalledOnce();
      expect(createdSpans.length).toBe(1);
      expect(createdSpans[0].getAttribute('data-symbol')).toBe('2330');
      expect(createdSpans[0].className).toBe('stocklion-target');
    } finally {
      (globalThis as any).document = originalDocument;
      (globalThis as any).NodeFilter = originalNodeFilter;
    }
  });

  it('should reject text nodes inside ignored tags like SCRIPT and TEXTAREA', () => {
    const mockScriptNode = {
      textContent: 'var stock = "2330 台積電 漲停";',
      parentElement: {
        tagName: 'SCRIPT',
        isContentEditable: false,
        classList: { contains: () => false },
        closest: () => null,
      },
    };

    let accepted = false;
    const originalDocument = (globalThis as any).document;
    const originalNodeFilter = (globalThis as any).NodeFilter;

    (globalThis as any).NodeFilter = {
      SHOW_TEXT: 4,
      FILTER_ACCEPT: 1,
      FILTER_REJECT: 2,
    };

    (globalThis as any).document = {
      createTreeWalker: vi.fn((_root, _whatToShow, filter) => {
        const res = filter.acceptNode(mockScriptNode);
        accepted = res === 1;
        return { nextNode: () => null };
      }),
      getElementById: vi.fn(() => null),
      head: { appendChild: vi.fn() },
      body: {},
    };

    try {
      scanner.scan({} as any);
      expect(accepted).toBe(false);
    } finally {
      (globalThis as any).document = originalDocument;
      (globalThis as any).NodeFilter = originalNodeFilter;
    }
  });
});
