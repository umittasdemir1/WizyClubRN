import { RideBookingForm } from "@/components/ui/ride-booking-form";

export default function RideBookingFormDemo() {
    const handleSearch = (details: {
        pickup: string;
        dropoff: string;
        date: string;
        time: string;
    }) => {
        console.log("Searching for a ride with details:", details);
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#f1f2ef] p-6">
            <RideBookingForm
                imageUrl="/images/studio/audit/location-picker-hero.webp"
                city="Chandigarh, IN"
                onSearch={handleSearch}
                className="my-8 min-h-[720px]"
            />
        </div>
    );
}
