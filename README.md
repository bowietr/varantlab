# VarantLab

Gerçek ve gecikmeli verilerle varant izleme prototipi. Sürüm: **0.6.1**.

## Kapsam

- İnfo Varant fiyat izleme sayfasının herkese açık csvData listesini okur. Kaynağın tüm varantlarını kapsar; diğer ihraççıların tamamını kapsamaz. 43 dayanak / 1.301 varant geliştirme sırasında doğrulandı; sayılar zamanla değişir.
- Dayanak seçimi, 50 kayıtlı sayfalama, kod/dayanak arama, alım/satım türü filtresi, vade, kullanım fiyatı, dayanak fiyatı, alış/satış, spread ve ayrı piyasa yapıcı kotasyonları.
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

Sonraki adımlar: Cloudflare bağlantı testi, fiyat zamanını doğrulama, diğer ihraççılarla veri kapsamının genişletilmesi. Geçmiş mum verileri, teknik sinyaller, backtest, hesap senkronizasyonu ve gerçek emir iletimi bu sürüme dahil değildir.

Kaynaklar:
- https://infovarant.com/piyasa/varant-fiyat-izleme
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

API anahtarlarını, Cloudflare tokenlarını veya şifreleri depoya eklemeyin.

## İşlem tutarı ve makas karşılaştırması (0.6.1)

İşlem tutarı kullanıcı tarafından değiştirilir; varsayılan 1.000 TL'dir. Tutar yalnızca kullanılan tarayıcıda saklanır. Alınabilecek tam adet, satış fiyatıyla kullanılan tutar, kalan para ve aynı kotasyonlarda alış fiyatından hemen çıkışın teorik makas maliyeti hesaplanır. Komisyon, vergi ve fiyat kayması dahil değildir; derinlik bilinmediğinden gerçekleşme garantisi vermez.

Makas sıralaması için aynı dayanak ve aynı yön seçilir. Pozitif ve tutarlı alış/satış kotasyonları ile en az bir adet alınabilen ürünler, yüzdesel makas artan şekilde sıralanır. Vade ön elemesi uygulanmaz. Bu karşılaştırma genel kalite veya kazanma olasılığı puanı değildir. Delta, teta ve kotasyon miktarı eklenmeden kapsamlı gün içi uygunluk puanı üretilmez.

## Varant detay sayfaları (0.6.1)

Her satır ve varant kodu `/varant.html?symbol=AB1KV.V` gibi paylaşılabilir bir detay adresine açılır. Son fiyat ve kaynak günlük değişimi, alış/satış, dayanak, vade, çarpan ve kotasyonlar gösterilir. Kaynağın son fiyatı `sonFiyat` alanından alınır.

Tarihsel borsa fiyat API'si doğrulanamadığı için geçmişe ait haftalık/aylık getiriler henüz sağlanamaz. Grafik, detay sayfası ziyaretlerinde aynı tarayıcıya kaydedilen gerçek son fiyat gözlemlerini gösterir. Kayıt zamanı kaynak fiyat zamanı değildir. Sayfa görünürken beş dakikada bir yenilenir. Tek noktadan çizgi üretilmez; eksik veri tahmin edilmez. 7 ve 30 günlük değişimler yalnızca ilgili başlangıç tarihine ait gözlem mevcutsa hesaplanır. Kayıtlar cihazlar arasında eşitlenmez ve tarayıcı verileri silinirse kaybolur. Gerçek geçmiş seri entegrasyonu bekleyen iştir.

## Sıralamalar (0.6.1)

Kod, düşük makas, günlük değişim (artan/azalan), kalan takvim günü (artan/azalan) ve yüksek basit kaldıraç. Makas ve kaldıraç sıralamaları aynı dayanak/yön seçimini gerektirir ve tutarla en az bir adet alınabilen, geçerli kotasyonlu, vadesi geçmemiş ürünleri kapsar. Diğer sıralamalar listeyi yalnızca düzenler.

Basit kaldıraç, bilinen TL dayanakları için `dayanak fiyatı × çarpan / satış fiyatı` olarak hesaplanır. Kur dönüşümü bilinmeyen ürünlerde boş bırakılır. Delta olmadan bu değer etkin kaldıraç, gerçek hassasiyet veya beklenen getiri değildir. Yüksek oran, fiyatı çok düşük / derin zararda ürünleri öne çıkarabilir. Getiri potansiyeli tahmini veya kazanma olasılığı sıralaması henüz sağlanmaz. Eksik metrikler en sona gider. Kaynak: https://infovarant.com/sozluk/kaldirac

## Senaryo fiyatlaması (0.6.1)

Black–Scholes ile temettüsüz Avrupa tipi teorik fiyatlama. Kaynak `faiz` alanı etkin yıllık yüzde kabul edilerek `ln(1+r)` ile sürekli bileşik faize dönüştürülür. Vadeye kalan tam takvim günü / 365 kullanılır; vade gününde saat/uzlaşı belirsiz olduğu için model uygulanmaz. TL cinsinden tanımlı dayanaklar desteklenir. Kaynakta temettü sıfır olarak belirtilmeyen ürünler dışlanır. Temettü sıfır olması doğrulanmış gelecekteki temettü takvimi değildir; kaynaktan gelen varsayımdır. Ürünlerin özel şartları ayrıca teyit edilmelidir.

İma edilen oynaklık, mevcut alış/satış orta fiyatını yeniden üreten model volatilitesi olarak bisection ile bulunur. Bu, ihraççının açıkladığı örtük oynaklık değildir. %0,1–%500 aralığı dışında veya model alt/üst sınırlarını ihlal eden / vega açısından kararsız kotasyonlar dışlanır. Model delta/gamma hesaplanır. Kullanıcının hedef dayanak hareketi, 0–24 saat bekleme süresi ve oynaklık puanı değişimi ile yeniden fiyatlanır. Mutlak makas sabit varsayılır ve tahmini çıkış alış fiyatı 0,01 TL kademesine aşağı yuvarlanır. Alım satış fiyatından yapılır, komisyon her iki işlem için uygulanır; adet giriş komisyonu dahil bütçeye sığdırılır. Vergi ve fiyat kayması dahil değildir.

Sıralama aynı dayanak/yönde **senaryoya bağlı net getiri yüzdesine** göredir; gerçekleşme olasılığı, beklenen değer veya yön tahmini değildir. Ters yönde aynı büyüklükte hareketin sonucu ayrıca gösterilir. Varsayılan ön eleme: en çok %10 makas, en az 0,10 mutlak model delta, en az 15 takvim günü; kullanıcı tümünü değiştirebilir. Bu eşikler doğrulanmış başarı oranına dayanmaz. Kaynak veriler gecikmeli ve tam eşzamanlı değildir; hesapların doğruluğu piyasa başarısı anlamına gelmez.

Kaynaklar: https://infoyatirim.com/urunler/varant ; https://varant.akyatirim.com.tr/rehber/varant/varant-degeri-nelerden-etkilenir ; https://www.optionseducation.org/referencelibrary/faq/technical-information
