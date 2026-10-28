# VarantLab

Gerçek ve gecikmeli verilerle varant izleme prototipi. Sürüm: **0.1.0**.

## Kapsam

- İnfo Varant fiyat izleme sayfasının sunucu tarafından oluşturulmuş ilk tablosunu okur. Tüm varantları veya tüm ihraççıları kapsamaz.
- Kod/dayanak arama, alım/satım türü filtresi, vade, kullanım fiyatı, dayanak fiyatı, alış/satış, spread ve ayrı piyasa yapıcı kotasyonları.
- Demo fiyat üretmez. Kaynak hatası veya tablo değişikliği olduğunda hata gösterir.
- Kaynak, üye girişi olmadan 15 dakika gecikmeli veri sunar. Ek önbellek süresi 5 dakikadır; verinin tam olarak 15 dakika eski olduğu garanti edilmez.
- Kaynağın çekildiği zaman ile fiyatın oluştuğu zaman farklıdır. Fiyat zamanı doğrulanmadığı için `quoteTime: null` döner.

## Cloudflare kurulumu

Workers & Pages → Create application → GitHub → `bowietr/varantlab`.

| Ayar | Değer |
| --- | --- |
| Worker adı | `varantlab` |
| Production branch | `main` |
| Root directory | Depo kökü (`/`) |
| Build command | Boş bırakın |
| Deploy command | `npx wrangler deploy` |

Save and Deploy sonrasında verilen workers.dev adresini açın. `/api/health` uygulama durumunu, `/api/quotes` kaynak bağlantısını sınar. İlk kurulumda veritabanı, ücretli API veya gizli anahtar gerekmez. Cloudflare ücretsiz plan kullanım sınırları geçerlidir; ücretli plan etkinleştirmek gerekmez.

## Yerel geliştirme

Node.js 22 veya üzeri:

```sh
npm install
npm test
npm run dev
```

## Mimari

`public/` statik ekranı, `src/worker.js` API ve önbelleği, `src/parser.js` kaynak dönüştürücüsünü içerir. Cloudflare statik dosyaları ve API'yi aynı adreste sunar. Upstream adresi sabittir; kullanıcı tarafından URL verilemez. Fiyatlar her edge konumunda beş dakika önbelleklenir. Otomatik arka plan taraması yoktur.

## Sınırlar ve sonraki adımlar

Bu sürüm veri bağlantısı testidir. Web sayfasını teknik olarak okumak, açık API veya yeniden yayınlama izni olduğu anlamına gelmez. Kaynak kullanım koşulları ve yeniden yayınlama izni doğrulanmış değildir. Daha geniş yayına geçmeden bu konu netleştirilmelidir. Kaynak sayfa yapısı değişirse dönüştürücü güncellenmelidir. Cloudflare çıkış IP'lerinden erişim henüz test edilmemiştir.

Sonraki adımlar: Cloudflare bağlantı testi, fiyat zamanını doğrulama, tüm listeye erişimin incelenmesi ve veri kapsamının genişletilmesi. Geçmiş mum verileri, teknik sinyaller, backtest, hesap senkronizasyonu ve gerçek emir iletimi bu sürüme dahil değildir.

Kaynaklar:
- https://infovarant.com/piyasa/varant-fiyat-izleme
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

API anahtarlarını, Cloudflare tokenlarını veya şifreleri depoya eklemeyin.
