"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type Donation = { id:number;donor_name:string|null;donor_email:string|null;amount_cents:number;payment_status:string;created_at:string;donation_date:string|null;account_name:string|null;payment_method:string|null;reference_number:string|null;message:string|null };
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n/100);
export default function DonationsPage(){
 const router=useRouter();const [rows,setRows]=useState<Donation[]>([]);const [accounts,setAccounts]=useState<string[]>([]);
 const [date,setDate]=useState(new Date().toISOString().slice(0,10));const [name,setName]=useState("");const [email,setEmail]=useState("");
 const [amount,setAmount]=useState("");const [account,setAccount]=useState("");const [method,setMethod]=useState("Cash");const [reference,setReference]=useState("");const [notes,setNotes]=useState("");
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function refresh(){const res=await fetch("/api/admin/donations",{cache:"no-store"});const data=await res.json();if(!res.ok)throw Error(data.error||"Could not load donations");setRows(data.donations||[]);setAccounts(data.accounts||[]);}
 useEffect(()=>{let active=true;(async()=>{try{
 const res=await fetch("/api/admin/me",{cache:"no-store"});const data=await res.json();
 if(!data.authenticated){router.push("/admin/login");return;}
 if(!["admin","treasurer"].includes(data.user?.role))throw Error("Access denied.");
 if(active)await refresh();
 }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load donations");}
 finally{if(active)setLoading(false);}})();return()=>{active=false};},[router]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setError("");setMessage("");
 if(!accounts.includes(account))return setError("Choose an active payment account.");
 if(!/^\d+(?:\.\d{1,2})?$/.test(amount)||Number(amount)<=0)return setError("Enter a valid amount.");
 setSaving(true);
 try{const res=await fetch("/api/admin/donations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
 mode:"manual-detailed",donationDate:date,donorName:name,donorEmail:email,amount,accountName:account,paymentMethod:method,referenceNumber:reference,message:notes
 })});const result=await res.json();if(!res.ok)throw Error(result.error||"Unable to save donation.");
 setMessage("Donation recorded. It is now included in Transactions and the Balance Sheet.");setAmount("");setReference("");setNotes("");
 try{await refresh()}catch{setError("Saved, but list refresh failed. Reload this page rather than recording the donation again.");}
 }catch(e){setError(e instanceof Error?e.message:"Unable to save donation");}finally{setSaving(false);}}
 const completed=rows.filter(x=>["manual","succeeded"].includes(x.payment_status));const total=completed.reduce((n,x)=>n+Number(x.amount_cents),0);
 return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950"><div className="mx-auto max-w-6xl">
 <h1 className="mb-2 text-3xl font-bold">Donations</h1><p className="mb-5 text-sm text-slate-600">Record donations already received outside the online payment process. Do not enter online Stripe donations a second time.</p>
 {error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
 {message&&<p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-green-800">{message}</p>}
 {loading?<p>Loading donations...</p>:<>
 <section className="mb-8 rounded-2xl border bg-white p-6"><h2 className="mb-5 text-xl font-bold">Record a Donation</h2>
 <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
 <label className="grid gap-1 text-sm font-semibold">Date received *<input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-lg border px-3 py-2"/></label>
 <label className="grid gap-1 text-sm font-semibold">Amount ($) *<input required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="rounded-lg border px-3 py-2"/></label>
 <label className="grid gap-1 text-sm font-semibold">Donor name *<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} className="rounded-lg border px-3 py-2"/></label>
 <label className="grid gap-1 text-sm font-semibold">Donor email<input type="email" maxLength={255} value={email} onChange={e=>setEmail(e.target.value)} className="rounded-lg border px-3 py-2"/></label>
 <label className="grid gap-1 text-sm font-semibold">Received into *<select required value={account} onChange={e=>setAccount(e.target.value)} className="rounded-lg border px-3 py-2"><option value="">Select an account</option>{accounts.map(a=><option key={a} value={a}>{a}</option>)}</select></label>
 <label className="grid gap-1 text-sm font-semibold">Payment method *<select value={method} onChange={e=>setMethod(e.target.value)} className="rounded-lg border px-3 py-2">{["Cash","Check","Bank transfer","Zelle","Credit card","Other"].map(a=><option key={a}>{a}</option>)}</select></label>
 <label className="grid gap-1 text-sm font-semibold">Reference / receipt number<input maxLength={160} value={reference} onChange={e=>setReference(e.target.value)} className="rounded-lg border px-3 py-2"/></label>
 <label className="grid gap-1 text-sm font-semibold">Notes<textarea maxLength={255} rows={2} value={notes} onChange={e=>setNotes(e.target.value)} className="rounded-lg border px-3 py-2"/></label>
 <div className="sm:col-span-2"><button type="submit" disabled={saving} className="rounded-full bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-50">{saving?"Saving...":"Record Donation"}</button><p className="mt-2 text-xs text-slate-500">This records money already received. It does not charge a donor or send an email.</p></div>
 </form></section>
 <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-5 py-4"><h2 className="text-xl font-bold">Recorded Donations</h2><strong>Completed total: {money(total)}</strong></div>
 <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-100"><tr>{["Date","Donor","Amount","Account","Method","Reference","Status"].map(t=><th key={t} className="p-3">{t}</th>)}</tr></thead>
 <tbody>{rows.map(d=><tr key={d.id} className="border-t"><td className="p-3">{d.donation_date||String(d.created_at).slice(0,10)}</td><td className="p-3">{d.donor_name||"Anonymous"}{d.donor_email&&<p className="text-xs text-slate-500">{d.donor_email}</p>}</td><td className="p-3 font-semibold">{money(Number(d.amount_cents))}</td><td className="p-3">{d.account_name||"Unknown (online)"}</td><td className="p-3">{d.payment_method||"Online"}</td><td className="p-3">{d.reference_number||"-"}</td><td className="p-3">{d.payment_status}</td></tr>)}
 {rows.length===0&&<tr><td colSpan={7} className="p-7 text-center text-slate-500">No donations recorded yet.</td></tr>}</tbody></table></div></section>
 </>}
 </div></main>
}
