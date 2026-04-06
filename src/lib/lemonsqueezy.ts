declare global {
  interface Window {
    createLemonSqueezy?: () => void
    LemonSqueezy?: {
      Url: {
        Open: (url: string) => void
      }
    }
  }
}

interface CheckoutUser {
  email: string
  display_name: string | null
  id: string
}

export function openCheckout(variantId: string, user: CheckoutUser) {
  const storeUrl = import.meta.env.VITE_LS_STORE_URL as string
  const url = `${storeUrl}/checkout/buy/${variantId}?checkout[email]=${encodeURIComponent(user.email)}&checkout[name]=${encodeURIComponent(user.display_name ?? '')}&checkout[custom][user_id]=${user.id}&embed=1&media=0&desc=0`
  window.LemonSqueezy?.Url.Open(url)
}

export const VARIANT_IDS = {
  pro_monthly: import.meta.env.VITE_LS_PRO_MONTHLY_VARIANT_ID as string,
  pro_annual: import.meta.env.VITE_LS_PRO_ANNUAL_VARIANT_ID as string,
  lab_monthly: import.meta.env.VITE_LS_LAB_MONTHLY_VARIANT_ID as string,
  lab_annual: import.meta.env.VITE_LS_LAB_ANNUAL_VARIANT_ID as string,
  report: import.meta.env.VITE_LS_REPORT_VARIANT_ID as string,
}
