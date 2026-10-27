import Link from "next/link";
import css from "./concepts.module.css";

/* Review page for the three directions. Not product UI. */

const CONCEPTS = [
  {
    id: "a",
    name: "Işık masası",
    en: "Light table",
    img: "/img/set-courtyard.jpg",
    idea: "Çıktı ilk karardan itibaren görünür. Her seçim masaya bir baskı olarak konur; kullanıcı form doldurmaz, bir kare kurar.",
    moment: "Başlatınca kompozisyon, dönüştüğü karelere yırtılır.",
    best: "İlk kez kullananlar ve ‘ne elde edeceğim?’ sorusu",
    risk: "Kompozisyon gerçek önizleme değil; beklenti yönetimi gerekir",
  },
  {
    id: "b",
    name: "Föy",
    en: "Tech pack",
    img: "/img/product-coat-detail.jpg",
    idea: "Sihirbaz yok. Bütün kararlar tek bir editoryal sayfada; seçmek yeterli, föy kendiliğinden ilerler.",
    moment: "Başlatınca kenardaki iplik bölüm bölüm dikilir.",
    best: "Dönen kullanıcı, hızlı düzenleme, kurulumu yeniden açma",
    risk: "Uzun sayfa; ilk kullanımda ne olacağını daha az gösterir",
  },
  {
    id: "c",
    name: "Kontak baskı",
    en: "Contact sheet",
    img: "/img/out-three-quarter.jpg",
    idea: "Fotoğrafçının ayıklama masası. Büyüteç yakından gösterir, seçim gres kalemiyle çizilir, klavyeyle gezilir.",
    moment: "Sonuçlar banyo tepsisindeki baskılar gibi gelişir, aynı kalemle ayıklanır.",
    best: "Görseli yargılamak: cast seçimi, sonuç ekranı, batch",
    risk: "Profesyonel araç hissi; yeni başlayan için soğuk olabilir",
  },
];

export default function ConceptsIndex() {
  return (
    <main className={css.page}>
      <header className={css.head}>
        <p className={css.kicker}>Liora Atelier · akış yüzeyi · üç yön</p>
        <h1 className={css.title}>Aynı an, üç farklı cevap.</h1>
        <p className={css.lede}>
          Üçü de Campaign akışının aynı dilimini oynatır: ürün yüklenmiş, cast seçiliyor, ardından ortam, hazır ve başlat. Kapsam aynı,
          tasarım farklı — böylece tasarımı karşılaştırırız, özellik sayısını değil.
        </p>
      </header>

      <section className={css.grid}>
        {CONCEPTS.map((c) => (
          <Link key={c.id} href={`/concepts/${c.id}`} className={css.card}>
            <span className={css.img}>
              <img src={c.img} alt="" />
              <span className={css.letter}>{c.id.toUpperCase()}</span>
            </span>
            <span className={css.name}>
              {c.name} <em>{c.en}</em>
            </span>
            <span className={css.idea}>{c.idea}</span>
            <dl className={css.facts}>
              <dt>İmza an</dt>
              <dd>{c.moment}</dd>
              <dt>En iyi olduğu yer</dt>
              <dd>{c.best}</dd>
              <dt>Risk</dt>
              <dd>{c.risk}</dd>
            </dl>
            <span className={css.open}>Aç →</span>
          </Link>
        ))}
      </section>

      <section className={css.rubric}>
        <h2>Durma kuralı — her yön bu beş sorudan geçmeli</h2>
        <ol>
          <li>Logoyu kapat: bu ekran başka bir SaaS olabilir mi?</li>
          <li>Çalışılan ekranın %40&apos;tan fazlası görsel mi?</li>
          <li>Üç saniyede tek bir sonraki aksiyon belli mi?</li>
          <li>Ekranda tek bir yüksek ses mi var?</li>
          <li>Metin kontrastı AA&apos;yı geçiyor mu? (4.5:1)</li>
        </ol>
      </section>
    </main>
  );
}
