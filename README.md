# PichaiCrab

เว็บบันทึกล็อตนำเข้าปูจากเวียดนามมาขายที่ไทย มี 3 หน้า: บันทึก (`/`), แดชบอร์ด (`/dashboard`), ข้อมูลดิบ (`/data`)

Astro + Cloudflare Workers + Cloudflare D1

## รันในเครื่อง

```bash
npm install
npm run db:migrate:local
npm run dev
```

เปิด http://localhost:4321 ข้อมูลในเครื่องเก็บใน `.wrangler/` (ไม่ขึ้น git)

## Deploy ขึ้น Cloudflare

1. ล็อกอิน: `npx wrangler login`
2. สร้างฐานข้อมูล: `npx wrangler d1 create pichai-crab` แล้วเอา `database_id` ที่ได้ไปใส่ใน `wrangler.jsonc`
3. สร้างตาราง: `npm run db:migrate:remote`
4. Deploy: `npm run deploy`
5. ปิดเว็บด้วย Cloudflare Access: Cloudflare dashboard > Zero Trust > Access > Applications > Add application > Self-hosted ใส่โดเมนของ Worker แล้วตั้ง policy ให้เฉพาะอีเมลของคุณเข้าได้ (ครอบคลุม `/api/*` ด้วย)

## สูตรคำนวณ

เรทคือ ดองต่อ 1 บาท ค่าดำเนินการ (VN และไทย) คิดต่อ กก.

| รายการ | สูตร |
|---|---|
| รวมค่าปู − ค่าดำเนินการ (₫) | ค่าปู − (ค่าดำเนินการ VN × กก.) |
| คิดเป็นเงินไทย (฿) | ค่าปู ÷ เรท 1 |
| ยอดเก็บลูกค้า (฿) | คิดเป็นเงินไทย + (ค่าดำเนินการไทย × กก.) |
| ยอดที่ต้องโอน (฿) | (ค่าปู − ค่าดำเนินการ VN รวม) ÷ เรท 2 |
| กำไร (฿) | ยอดเก็บลูกค้า − ยอดที่ต้องโอน |
