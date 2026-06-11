---
name: frontend-style
description: E-TEST frontend dizayn tizimi va Tailwind qoidalari. React komponent, sahifa, forma yoki UI elementi yaratish/o'zgartirishda HAR DOIM ishlatiladi.
---

# E-TEST dizayn tizimi (Tailwind CSS)

## Asosiy tamoyil
Barcha UI Tailwind utility klasslari bilan yoziladi. Inline style va alohida css
fayllar ishlatilmaydi (global index.css dan tashqari). Takrorlanadigan UI bloklari
src/components/ui/ da umumiy komponent qilinadi.

## Ranglar (tailwind.config.js da)
- primary — ko'k: asosiy tugmalar, havolalar, faol holatlar
- success — yashil: o'tdi, to'g'ri javob
- danger — qizil: o'tmadi, xato, o'chirish
- warning — sariq: ogohlantirishlar (tab almashtirish, vaqt tugayapti)
- Neytral: gray-50..900. Boshqa rang oilasi ishlatilmaydi.

## Tipografiya
- Shrift: Inter, fallback system-ui
- Sahifa sarlavhasi: text-2xl font-semibold text-gray-900
- Bo'lim sarlavhasi: text-lg font-medium text-gray-900
- Oddiy matn: text-sm text-gray-700; yordamchi: text-xs text-gray-500
- Minimal o'lcham text-xs

## Masofa va joylashuv
- Spacing 4 ga karrali: p-2 p-4 p-6 gap-4 mt-6
- Konteyner: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Karta: bg-white rounded-lg border border-gray-200 p-6 (shadow faqat modal/dropdown)
- Forma bitta ustunda, label tepada: block text-sm font-medium text-gray-700 mb-1

## Holatlar (majburiy)
Har ma'lumot komponentida 4 holat: loading (skeleton animate-pulse),
bo'sh (tushuntiruvchi matn + amal tugmasi), xato (danger rang + qayta urinish),
data (asosiy ko'rinish).

## Moslashuvchanlik
Mobile-first: avval kichik ekran, keyin sm: md: lg:. Test topshirish sahifasi
telefonda benuqson ishlashi shart. Admin jadvallar: overflow-x-auto.

## Accessibility
Har input label bilan bog'lanadi. Ikonkali tugmalarga aria-label. Faqat rang
bilan ma'no berilmaydi. Focus holati o'chirilmaydi (ring qo'shilmasa).

## Taqiqlar
!important; ixtiyoriy qiymatlar w-[137px] (zarur bo'lmasa); inline style;
styled-components; bir komponentda 2 tadan ortiq rang oilasi; gradient;
og'ir animatsiya (faqat transition-colors).
