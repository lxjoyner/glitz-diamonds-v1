import Link from "next/link";

export default async function VendorCreateBillPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <main className="min-h-screen bg-[#f7f9fc] px-4 py-8 text-slate-950 sm:px-8">
            <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
                <h1 className="text-3xl font-bold">Create bill</h1>
                <p className="mt-3 text-slate-600">Vendor #{id} is selected. Bill creation will be connected to the expenses/bills workflow in the next phase.</p>
                <Link href="/admin/vendors" className="mt-6 inline-flex rounded-full bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800">Back to Vendors</Link>
            </div>
        </main>
    );
}
