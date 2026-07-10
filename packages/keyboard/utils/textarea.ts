/** Delete one code point before the cursor (or the selection, if any). */
export function deleteBackward(ta: HTMLTextAreaElement): void {
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  if (start !== end) {
    ta.setRangeText("", start, end, "end");
    return;
  }
  if (start === 0) return;
  const prev = ta.value.codePointAt(start - 2 >= 0 ? start - 2 : 0);
  const isSurrogatePair = start >= 2 && prev !== undefined && prev > 0xffff;
  ta.setRangeText("", start - (isSurrogatePair ? 2 : 1), start, "end");
}
