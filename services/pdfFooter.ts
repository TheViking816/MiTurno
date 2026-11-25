import type jsPDF from 'jspdf';

export const PDF_FOOTER_MARGIN = 22;
export const SHIFT_BREAK_NOTICE = 'Cada turno incluye 30 minutos de descanso para comer, no computables como tiempo de trabajo efectivo';

export const addShiftBreakNotice = (doc: jsPDF) => {
  const unitsPerMillimeter = 72 / 25.4 / doc.internal.scaleFactor;
  const margin = 14 * unitsPerMillimeter;

  for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const lines = doc.splitTextToSize(SHIFT_BREAK_NOTICE, width - margin * 2);
    doc.text(lines, width / 2, height - 12 * unitsPerMillimeter, { align: 'center' });
  }
};
