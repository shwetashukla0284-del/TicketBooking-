import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing data
  await prisma.waitlistOffer.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.holdItem.deleteMany();
  await prisma.hold.deleteMany();
  await prisma.showSeat.deleteMany();
  await prisma.show.deleteMany();
  await prisma.event.deleteMany();
  await prisma.venueSeat.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.seatCategory.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@ticketbooking.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const organiser = await prisma.user.create({
    data: {
      name: 'Apex Entertainment (Organiser)',
      email: 'organiser@ticketbooking.com',
      passwordHash,
      role: 'ORGANISER',
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: 'Alex Johnson',
      email: 'customer@ticketbooking.com',
      passwordHash,
      role: 'CUSTOMER',
    },
  });

  console.log('✅ Users created (admin, organiser, customer)');

  // 3. Create Seat Categories
  const catPremium = await prisma.seatCategory.create({
    data: { name: 'Premium', description: 'Best viewing angle with spacious recliners' },
  });

  const catStandard = await prisma.seatCategory.create({
    data: { name: 'Standard', description: 'Standard comfortable theater seating' },
  });

  const catVIP = await prisma.seatCategory.create({
    data: { name: 'VIP Box', description: 'Exclusive VIP lounge access & front row view' },
  });

  console.log('✅ Seat categories created');

  // 4. Create Venue 1: Grand Cinema Hall
  const venueCinema = await prisma.venue.create({
    data: {
      name: 'Grand Cinema Hall 1',
      address: '100 Metro Plaza, Downtown',
      capacity: 40,
      status: 'ACTIVE',
    },
  });

  // Create 40 seats (4 rows A-D, 10 seats per row)
  const cinemaSeats = [];
  const rowsCinema = ['A', 'B', 'C', 'D'];
  for (let rIdx = 0; rIdx < rowsCinema.length; rIdx++) {
    const row = rowsCinema[rIdx];
    for (let seatNum = 1; seatNum <= 10; seatNum++) {
      let categoryId = catStandard.id;
      if (row === 'A' || row === 'B') categoryId = catPremium.id;
      if (row === 'A' && (seatNum >= 4 && seatNum <= 7)) categoryId = catVIP.id;

      const seat = await prisma.venueSeat.create({
        data: {
          venueId: venueCinema.id,
          row,
          seatNumber: seatNum,
          categoryId,
          positionX: seatNum * 50,
          positionY: rIdx * 50,
        },
      });
      cinemaSeats.push(seat);
    }
  }

  console.log(`✅ Venue created: ${venueCinema.name} with ${cinemaSeats.length} seats`);

  // 5. Create Venue 2: Starlight Symphony Arena
  const venueArena = await prisma.venue.create({
    data: {
      name: 'Starlight Symphony Arena',
      address: '500 Concert Boulevard',
      capacity: 60,
      status: 'ACTIVE',
    },
  });

  const rowsArena = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let rIdx = 0; rIdx < rowsArena.length; rIdx++) {
    const row = rowsArena[rIdx];
    for (let seatNum = 1; seatNum <= 10; seatNum++) {
      let categoryId = catStandard.id;
      if (row === 'A' || row === 'B') categoryId = catVIP.id;
      else if (row === 'C' || row === 'D') categoryId = catPremium.id;

      await prisma.venueSeat.create({
        data: {
          venueId: venueArena.id,
          row,
          seatNumber: seatNum,
          categoryId,
          positionX: seatNum * 50,
          positionY: rIdx * 50,
        },
      });
    }
  }

  // 6. Create Events
  const movieEvent = await prisma.event.create({
    data: {
      organiserId: organiser.id,
      venueId: venueCinema.id,
      title: 'Neon Odyssey 2099',
      type: 'MOVIE',
      description: 'A mind-bending sci-fi thriller set in a futuristic cyberpunk metropolis.',
      status: 'PUBLISHED',
      imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop',
    },
  });

  const concertEvent = await prisma.event.create({
    data: {
      organiserId: organiser.id,
      venueId: venueArena.id,
      title: 'Electric Horizon World Tour',
      type: 'CONCERT',
      description: 'Experience an exhilarating night of live electronic music, laser light shows, and immersive soundscapes.',
      status: 'PUBLISHED',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop',
    },
  });

  console.log('✅ Events created: Neon Odyssey 2099 & Electric Horizon World Tour');

  // 7. Create Shows for Events
  const showTime1 = new Date();
  showTime1.setHours(showTime1.getHours() + 24); // Tomorrow 8 PM
  const showTime1End = new Date(showTime1.getTime() + 2.5 * 60 * 60 * 1000);

  const movieShow = await prisma.show.create({
    data: {
      eventId: movieEvent.id,
      startTime: showTime1,
      endTime: showTime1End,
    },
  });

  // Populate ShowSeats inventory for Movie Show
  for (const vSeat of cinemaSeats) {
    let price = 15.0; // Standard
    if (vSeat.categoryId === catPremium.id) price = 25.0;
    if (vSeat.categoryId === catVIP.id) price = 40.0;

    await prisma.showSeat.create({
      data: {
        showId: movieShow.id,
        venueSeatId: vSeat.id,
        categoryId: vSeat.categoryId,
        price,
        status: 'AVAILABLE',
      },
    });
  }

  console.log(`✅ Show created for ${movieEvent.title} with 40 seat inventory entries`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
