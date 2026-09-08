from datetime import date, timedelta

from app.auth.service import hash_password
from app.bookings.models import Booking, BookingStatus
from app.database.base import Base
from app.database.connection import SessionLocal, engine
from app.listings.models import Amenity, Listing, ListingImage
from app.reviews.models import Review
from app.users.models import User, UserRole
from app.wishlist.models import Wishlist


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if db.query(User).first():
            print("Database already seeded")
            return

        amenity_names = [
            "WiFi", "Kitchen", "Air conditioning", "Heating", "Washer",
            "Dryer", "TV", "Pool", "Hot tub", "Free parking",
            "EV charger", "Gym", "BBQ grill", "Fireplace", "Beach access",
        ]
        amenities = []
        for name in amenity_names:
            a = Amenity(name=name)
            db.add(a)
            amenities.append(a)
        db.flush()

        _pw = hash_password("password123")
        users = [
            User(name="Priya Sharma", email="priya@example.com", role=UserRole.HOST, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=priya", password_hash=_pw),
            User(name="Rahul Patel", email="rahul@example.com", role=UserRole.HOST, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=rahul", password_hash=_pw),
            User(name="Anjali Desai", email="anjali@example.com", role=UserRole.HOST, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=anjali", password_hash=_pw),
            User(name="Vikram Singh", email="vikram@example.com", role=UserRole.GUEST, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=vikram", password_hash=_pw),
            User(name="Meera Iyer", email="meera@example.com", role=UserRole.GUEST, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=meera", password_hash=_pw),
            User(name="Arjun Reddy", email="arjun@example.com", role=UserRole.GUEST, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=arjun", password_hash=_pw),
            User(name="Sneha Kapoor", email="sneha@example.com", role=UserRole.HOST, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=sneha", password_hash=_pw),
            User(name="Deepak Mehta", email="deepak@example.com", role=UserRole.GUEST, avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=deepak", password_hash=_pw),
        ]
        for u in users:
            db.add(u)
        db.flush()

        listings_data = [
            {"host": users[0], "title": "Luxury Beach Villa in Calangute", "description": "A stunning beachfront villa with panoramic ocean views, private pool, and modern amenities. Perfect for families and groups looking for a luxurious Goa getaway.", "property_type": "VILLA", "location": "Calangute, Goa", "latitude": 15.5449, "longitude": 73.7550, "price_per_night": 12000, "max_guests": 8, "bedrooms": 4, "beds": 5, "bathrooms": 3, "amenity_idx": [0, 1, 2, 7, 9, 12], "images": ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800", "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"]},
            {"host": users[0], "title": "Cozy Beach Shack in Palolem", "description": "Simple, charming beach shack steps from the sand. Fall asleep to the sound of waves.", "property_type": "CABIN", "location": "Palolem, Goa", "latitude": 15.0100, "longitude": 74.0232, "price_per_night": 2500, "max_guests": 2, "bedrooms": 1, "beds": 1, "bathrooms": 1, "amenity_idx": [0, 2, 14], "images": ["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800", "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"]},
            {"host": users[1], "title": "Modern Apartment in Bandra", "description": "Sleek, modern apartment in the heart of Bandra with city views. Walking distance to restaurants, cafes, and Bandstand Promenade.", "property_type": "APARTMENT", "location": "Bandra, Mumbai", "latitude": 19.0544, "longitude": 72.8402, "price_per_night": 8000, "max_guests": 4, "bedrooms": 2, "beds": 2, "bathrooms": 2, "amenity_idx": [0, 1, 2, 3, 4, 6], "images": ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800", "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"]},
            {"host": users[1], "title": "Sea-View Studio in Juhu", "description": "Compact studio with stunning Arabian Sea views from the balcony.", "property_type": "APARTMENT", "location": "Juhu, Mumbai", "latitude": 19.0883, "longitude": 72.8263, "price_per_night": 5500, "max_guests": 2, "bedrooms": 1, "beds": 1, "bathrooms": 1, "amenity_idx": [0, 1, 2, 6], "images": ["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800", "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800"]},
            {"host": users[2], "title": "Heritage Haveli in Old City", "description": "Experience royal Rajasthani hospitality in this beautifully restored haveli. Rooftop terrace with views of Nahargarh Fort.", "property_type": "HOUSE", "location": "Old City, Jaipur", "latitude": 26.9239, "longitude": 75.8267, "price_per_night": 6000, "max_guests": 6, "bedrooms": 3, "beds": 4, "bathrooms": 2, "amenity_idx": [0, 1, 2, 3, 13], "images": ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"]},
            {"host": users[2], "title": "Designer Loft in Hauz Khas", "description": "Artsy designer loft in trendy Hauz Khas Village. Exposed brick, modern furnishings.", "property_type": "APARTMENT", "location": "Hauz Khas, Delhi", "latitude": 28.5494, "longitude": 77.2001, "price_per_night": 4500, "max_guests": 3, "bedrooms": 1, "beds": 2, "bathrooms": 1, "amenity_idx": [0, 1, 2, 3, 6], "images": ["https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800", "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800"]},
            {"host": users[6], "title": "Houseboat on Alleppey Backwaters", "description": "Traditional Kerala houseboat converted into a floating luxury stay. Cruise through serene backwaters.", "property_type": "HOUSEBOAT", "location": "Alleppey, Kerala", "latitude": 9.4981, "longitude": 76.3388, "price_per_night": 15000, "max_guests": 4, "bedrooms": 2, "beds": 2, "bathrooms": 2, "amenity_idx": [1, 2], "images": ["https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800", "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"]},
            {"host": users[6], "title": "Treehouse Retreat in Munnar", "description": "Unique treehouse nestled in tea plantations. Wake up to misty mountain views.", "property_type": "TREEHOUSE", "location": "Munnar, Kerala", "latitude": 10.0889, "longitude": 77.0595, "price_per_night": 7000, "max_guests": 2, "bedrooms": 1, "beds": 1, "bathrooms": 1, "amenity_idx": [0, 1, 3], "images": ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800"]},
            {"host": users[0], "title": "Mountain Cottage in Old Manali", "description": "Cozy wooden cottage with Himalayan views. Fireplace, garden, and walking distance to cafes.", "property_type": "CABIN", "location": "Old Manali, Himachal Pradesh", "latitude": 32.2432, "longitude": 77.1892, "price_per_night": 3500, "max_guests": 4, "bedrooms": 2, "beds": 2, "bathrooms": 1, "amenity_idx": [0, 1, 3, 9, 13], "images": ["https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800", "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800"]},
            {"host": users[2], "title": "Lake View Palace Room in Udaipur", "description": "Elegant palace-style accommodation overlooking Lake Pichola.", "property_type": "HOTEL", "location": "Udaipur, Rajasthan", "latitude": 24.5854, "longitude": 73.6833, "price_per_night": 9000, "max_guests": 2, "bedrooms": 1, "beds": 1, "bathrooms": 1, "amenity_idx": [0, 1, 2, 6, 11], "images": ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800", "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800", "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"]},
            {"host": users[6], "title": "French Colonial Home in White Town", "description": "Charming French colonial house in Pondicherry's White Town.", "property_type": "HOUSE", "location": "White Town, Pondicherry", "latitude": 11.9344, "longitude": 79.8306, "price_per_night": 5000, "max_guests": 4, "bedrooms": 2, "beds": 2, "bathrooms": 2, "amenity_idx": [0, 1, 2, 4, 14], "images": ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"]},
            {"host": users[1], "title": "Colonial Bungalow with Tea Garden Views", "description": "Historic colonial bungalow surrounded by tea gardens. Watch the sunrise over Kanchenjunga.", "property_type": "HOUSE", "location": "Darjeeling, West Bengal", "latitude": 27.0360, "longitude": 88.2627, "price_per_night": 4000, "max_guests": 6, "bedrooms": 3, "beds": 3, "bathrooms": 2, "amenity_idx": [0, 1, 3, 9, 13], "images": ["https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800", "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800"]},
            {"host": users[6], "title": "Coffee Estate Bungalow in Coorg", "description": "Private bungalow in a working coffee estate. Nature walks, bird watching.", "property_type": "HOUSE", "location": "Coorg, Karnataka", "latitude": 12.3375, "longitude": 75.8069, "price_per_night": 6500, "max_guests": 6, "bedrooms": 3, "beds": 4, "bathrooms": 2, "amenity_idx": [0, 1, 3, 9, 12], "images": ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800"]},
            {"host": users[1], "title": "Riverside Yoga Retreat", "description": "Peaceful retreat by the Ganges. Daily yoga sessions and organic meals.", "property_type": "HOUSE", "location": "Rishikesh, Uttarakhand", "latitude": 30.0869, "longitude": 78.2676, "price_per_night": 3000, "max_guests": 2, "bedrooms": 1, "beds": 1, "bathrooms": 1, "amenity_idx": [0, 1, 11], "images": ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800", "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800"]},
            {"host": users[0], "title": "Victorian Cottage in Shimla Hills", "description": "Quaint Victorian-era cottage with pine-forested surroundings and valley views.", "property_type": "CABIN", "location": "Shimla, Himachal Pradesh", "latitude": 31.1048, "longitude": 77.1734, "price_per_night": 3800, "max_guests": 4, "bedrooms": 2, "beds": 2, "bathrooms": 1, "amenity_idx": [0, 1, 3, 9, 13], "images": ["https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800", "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"]},
            {"host": users[2], "title": "Tech Hub Studio in Koramangala", "description": "Modern studio apartment in Bangalore's tech hub. High-speed WiFi.", "property_type": "APARTMENT", "location": "Koramangala, Bangalore", "latitude": 12.9352, "longitude": 77.6245, "price_per_night": 3500, "max_guests": 2, "bedrooms": 1, "beds": 1, "bathrooms": 1, "amenity_idx": [0, 1, 2, 4, 6, 11], "images": ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800", "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"]},
            {"host": users[1], "title": "Ganges-View Heritage Stay", "description": "Traditional heritage home overlooking the sacred Ganges ghats.", "property_type": "HOUSE", "location": "Varanasi, Uttar Pradesh", "latitude": 25.3176, "longitude": 83.0068, "price_per_night": 2800, "max_guests": 4, "bedrooms": 2, "beds": 2, "bathrooms": 1, "amenity_idx": [0, 1, 2, 3], "images": ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"]},
            {"host": users[0], "title": "Luxury Camp at Pangong Lake", "description": "Glamping at its finest beside the stunning Pangong Lake. Star-gazing and mountain views.", "property_type": "TENT", "location": "Pangong, Ladakh", "latitude": 33.7595, "longitude": 78.6712, "price_per_night": 8500, "max_guests": 2, "bedrooms": 1, "beds": 1, "bathrooms": 1, "amenity_idx": [3], "images": ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800"]},
            {"host": users[6], "title": "Colonial Estate in Ooty Hills", "description": "Grand colonial estate with manicured gardens in the Nilgiri Hills.", "property_type": "HOUSE", "location": "Ooty, Tamil Nadu", "latitude": 11.4102, "longitude": 76.6950, "price_per_night": 7500, "max_guests": 8, "bedrooms": 4, "beds": 5, "bathrooms": 3, "amenity_idx": [0, 1, 3, 9, 13, 12], "images": ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"]},
            {"host": users[2], "title": "Heritage Haveli near Golden Temple", "description": "Beautifully restored Punjabi haveli just 500m from the Golden Temple.", "property_type": "HOUSE", "location": "Amritsar, Punjab", "latitude": 31.6200, "longitude": 74.8765, "price_per_night": 3200, "max_guests": 6, "bedrooms": 3, "beds": 3, "bathrooms": 2, "amenity_idx": [0, 1, 2, 3, 9], "images": ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"]},
        ]

        listings = []
        for ld in listings_data:
            listing = Listing(
                host_id=ld["host"].id,
                title=ld["title"],
                description=ld["description"],
                property_type=ld["property_type"],
                location=ld["location"],
                latitude=ld["latitude"],
                longitude=ld["longitude"],
                price_per_night=ld["price_per_night"],
                max_guests=ld["max_guests"],
                bedrooms=ld["bedrooms"],
                beds=ld["beds"],
                bathrooms=ld["bathrooms"],
                amenities=[amenities[i] for i in ld["amenity_idx"]],
                images=[
                    ListingImage(image_url=url, display_order=i)
                    for i, url in enumerate(ld["images"])
                ],
            )
            db.add(listing)
            listings.append(listing)
        db.flush()

        today = date.today()
        bookings_data = [
            {"listing": listings[0], "guest": users[3], "check_in": today - timedelta(days=30), "check_out": today - timedelta(days=25), "guests": 4, "status": BookingStatus.COMPLETED},
            {"listing": listings[2], "guest": users[4], "check_in": today - timedelta(days=20), "check_out": today - timedelta(days=17), "guests": 2, "status": BookingStatus.COMPLETED},
            {"listing": listings[4], "guest": users[5], "check_in": today - timedelta(days=15), "check_out": today - timedelta(days=12), "guests": 3, "status": BookingStatus.COMPLETED},
            {"listing": listings[6], "guest": users[3], "check_in": today - timedelta(days=45), "check_out": today - timedelta(days=42), "guests": 2, "status": BookingStatus.COMPLETED},
            {"listing": listings[8], "guest": users[7], "check_in": today - timedelta(days=10), "check_out": today - timedelta(days=7), "guests": 2, "status": BookingStatus.COMPLETED},
            {"listing": listings[1], "guest": users[4], "check_in": today + timedelta(days=5), "check_out": today + timedelta(days=10), "guests": 2, "status": BookingStatus.CONFIRMED},
            {"listing": listings[3], "guest": users[5], "check_in": today + timedelta(days=10), "check_out": today + timedelta(days=14), "guests": 2, "status": BookingStatus.CONFIRMED},
            {"listing": listings[5], "guest": users[7], "check_in": today + timedelta(days=3), "check_out": today + timedelta(days=6), "guests": 2, "status": BookingStatus.CONFIRMED},
            {"listing": listings[7], "guest": users[3], "check_in": today + timedelta(days=20), "check_out": today + timedelta(days=23), "guests": 2, "status": BookingStatus.CANCELLED},
        ]

        bookings = []
        for bd in bookings_data:
            listing = bd["listing"]
            nights = (bd["check_out"] - bd["check_in"]).days
            nightly_subtotal = listing.price_per_night * nights
            cleaning_fee = round(nightly_subtotal * 0.10, 2)
            service_fee = round(nightly_subtotal * 0.12, 2)
            total = round(nightly_subtotal + cleaning_fee + service_fee, 2)
            booking = Booking(
                listing_id=listing.id,
                guest_id=bd["guest"].id,
                check_in=bd["check_in"],
                check_out=bd["check_out"],
                guests=bd["guests"],
                nightly_price=listing.price_per_night,
                nights=nights,
                cleaning_fee=cleaning_fee,
                service_fee=service_fee,
                total_price=total,
                status=bd["status"],
            )
            db.add(booking)
            bookings.append(booking)
        db.flush()

        reviews_data = [
            {"booking": bookings[0], "listing": listings[0], "user": users[3], "rating": 5, "comment": "Absolutely stunning villa! The ocean views were breathtaking and the pool was amazing."},
            {"booking": bookings[1], "listing": listings[2], "user": users[4], "rating": 4, "comment": "Great location in Bandra. The apartment was clean and well-maintained."},
            {"booking": bookings[2], "listing": listings[4], "user": users[5], "rating": 5, "comment": "A magical experience! The haveli is beautifully restored."},
            {"booking": bookings[3], "listing": listings[6], "user": users[3], "rating": 5, "comment": "The houseboat experience was once in a lifetime. Highly recommend!"},
            {"booking": bookings[4], "listing": listings[8], "user": users[7], "rating": 4, "comment": "Lovely cottage with great mountain views. The fireplace was perfect."},
        ]

        for rd in reviews_data:
            review = Review(
                listing_id=rd["listing"].id,
                user_id=rd["user"].id,
                booking_id=rd["booking"].id,
                rating=rd["rating"],
                comment=rd["comment"],
            )
            db.add(review)
            listing = rd["listing"]
            total_rating = listing.rating * listing.review_count + rd["rating"]
            listing.review_count += 1
            listing.rating = round(total_rating / listing.review_count, 2)

        wishlist_items = [
            Wishlist(user_id=users[3].id, listing_id=listings[6].id),
            Wishlist(user_id=users[3].id, listing_id=listings[7].id),
            Wishlist(user_id=users[4].id, listing_id=listings[0].id),
            Wishlist(user_id=users[4].id, listing_id=listings[4].id),
            Wishlist(user_id=users[5].id, listing_id=listings[2].id),
            Wishlist(user_id=users[7].id, listing_id=listings[9].id),
        ]
        for w in wishlist_items:
            db.add(w)

        db.commit()
        print(f"Seeded: {len(users)} users, {len(listings)} listings, {len(bookings)} bookings, {len(reviews_data)} reviews")
        print("Demo credentials: priya@example.com / password123 (HOST)")
        print("Demo credentials: vikram@example.com / password123 (GUEST)")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
