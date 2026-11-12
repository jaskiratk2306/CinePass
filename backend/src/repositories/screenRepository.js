import { prisma } from '../config/db.js';

export async function findScreenById(id) {
  return prisma.screen.findUnique({
    where: { id },
    include: {
      theatre: true,
      seats: {
        include: {
          category: true,
        },
        orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
      },
    },
  });
}

/**
 * Creates screen and auto-generates seats.
 * @param {object} params
 * @param {string} params.theatreId
 * @param {string} params.name
 * @param {number} params.rows
 * @param {number} params.cols
 * @param {Array<{ startRow: number, endRow: number, categoryId: string }>} [params.categoryRanges]
 */
export async function createScreenWithSeats({ theatreId, name, rows, cols, categoryRanges = [] }) {
  return prisma.$transaction(async (tx) => {
    // 1. Create screen
    const screen = await tx.screen.create({
      data: {
        theatreId,
        name,
        rows,
        cols,
      },
    });

    // 2. Determine default category if none specified
    let defaultCategory = null;
    if (categoryRanges.length === 0) {
      defaultCategory = await tx.seatCategory.findFirst({
        where: { name: 'REGULAR' },
      });
      if (!defaultCategory) {
        defaultCategory = await tx.seatCategory.findFirst();
      }
    }

    // 3. Auto-generate seats
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const seatsData = [];

    for (let r = 0; r < rows; r++) {
      const rowLabel = alphabet[r] || `R${r + 1}`;
      let assignedCategoryId = defaultCategory?.id;

      // Check category ranges (1-indexed or 0-indexed handled gracefully)
      for (const range of categoryRanges) {
        const start = range.startRow;
        const end = range.endRow;
        // if user passed 1-based (e.g. 1 to 2)
        if (r + 1 >= start && r + 1 <= end) {
          assignedCategoryId = range.categoryId;
          break;
        }
      }

      if (!assignedCategoryId) {
        if (!defaultCategory) {
          const fallback = await tx.seatCategory.findFirst();
          assignedCategoryId = fallback.id;
        } else {
          assignedCategoryId = defaultCategory.id;
        }
      }

      for (let c = 1; c <= cols; c++) {
        seatsData.push({
          screenId: screen.id,
          rowLabel,
          number: c,
          categoryId: assignedCategoryId,
        });
      }
    }

    await tx.seat.createMany({
      data: seatsData,
    });

    return tx.screen.findUnique({
      where: { id: screen.id },
      include: {
        theatre: true,
        seats: {
          include: { category: true },
          orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
        },
      },
    });
  });
}

export async function deleteScreen(id) {
  return prisma.screen.delete({
    where: { id },
  });
}
