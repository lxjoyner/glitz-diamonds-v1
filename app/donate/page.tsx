import { Suspense } from "react";
import DonationForm from "@/components/DonationForm";

export default function DonatePage() {
    return (
        <Suspense>
            <DonationForm />
        </Suspense>
    );
}
