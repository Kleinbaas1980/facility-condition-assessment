import AuthForm from "@/components/auth-form";
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}){const params=await searchParams;return <AuthForm mode="verify" token={typeof params.token==='string'?params.token:''} />;}
