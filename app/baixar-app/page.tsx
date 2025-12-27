import { redirect } from 'next/navigation'

export default function BaixarAppPage() {
    // Redirect to APK download on Supabase Storage
    redirect('https://cmgmobhnrjawfdafhqko.supabase.co/storage/v1/object/public/documentos/Operium.apk')
}
