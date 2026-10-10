import { scrollPastNumberFields } from './number-wheel';

describe('scrollPastNumberFields', () => {
  let stop: () => void;
  let input: HTMLInputElement;
  let scrollBy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    input = document.createElement('input');
    input.type = 'number';
    document.body.append(input);
    scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
    stop = scrollPastNumberFields(document);
  });

  afterEach(() => {
    stop();
    input.remove();
    scrollBy.mockRestore();
  });

  const wheel = (target: Element, init: WheelEventInit = {}) => {
    const event = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    target.dispatchEvent(event);
    return event;
  };

  it('scrolls the page instead of stepping a focused number field', () => {
    input.focus();

    const event = wheel(input);

    expect(event.defaultPrevented).toBe(true);
    expect(scrollBy).toHaveBeenCalledWith(0, 100);
  });

  it('scrolls lines as about a line each', () => {
    input.focus();

    wheel(input, { deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE });

    expect(scrollBy).toHaveBeenCalledWith(0, 48);
  });

  it('leaves the wheel alone elsewhere, on a field without focus and for the zoom', () => {
    const text = document.createElement('input');
    document.body.append(text);
    text.focus();
    expect(wheel(text).defaultPrevented).toBe(false);
    expect(wheel(input).defaultPrevented).toBe(false);
    text.remove();

    input.focus();
    expect(wheel(input, { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('stops with its clean-up', () => {
    stop();
    input.focus();

    expect(wheel(input).defaultPrevented).toBe(false);
  });
});
