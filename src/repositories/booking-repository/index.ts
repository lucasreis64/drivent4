import { prisma } from "@/config";
import { Booking } from "@prisma/client";

async function findBooking(userId: number) {
  return prisma.booking.findFirst({
    where: {
      userId: userId,
    },
    select: {
      id: true,
      Room: true,
    }
  });
}

async function findRoom(roomId: number) {
  return prisma.room.findFirst({
    where: {
      id: roomId,
    },
    include: {
      Booking: true,
    }
  });
}

async function upsertBooking(id: number, data: bookingParams) {
  return prisma.booking.upsert({
    where: {
      id
    },
    create: {
      userId: data.userId,
      roomId: data.roomId
    },
    update: {
      roomId: data.roomId
    }
  });
}

export type bookingParams = Omit<Booking, "id" | "createdAt" | "updatedAt">

const bookingRepository = {
  upsertBooking,
  findBooking,
  findRoom,
};

export default bookingRepository;
