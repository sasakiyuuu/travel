// app.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // npm install node-fetch@2
const app = express();
const PORT = process.env.PORT || 3000;

// EJS テンプレートエンジンの設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静的ファイル（CSS、画像等）の提供
app.use(express.static(path.join(__dirname, 'public')));

// Body Parser ミドルウェア
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// デモ用：メモリ上のユーザーと予約情報
const users = {}; // キーはメールアドレス
const bookings = [];

// サンプルホテルデータ（必要に応じて20件程度追加してください）
const hotels = [
  { id: 1, name: 'ホテル東京', location: '東京都新宿区', regularPrice: '¥15,000/泊', lowestPrice: '¥13,500', image: 'https://source.unsplash.com/featured/?hotel,Tokyo', description: '東京の中心部に位置し、快適な滞在をお約束します。' },
  { id: 2, name: 'ホテル大阪', location: '大阪市北区', regularPrice: '¥12,000/泊', lowestPrice: '¥10,800', image: 'https://source.unsplash.com/featured/?hotel,Osaka', description: '大阪の魅力を感じられるロケーションにあるホテルです。' },
  { id: 3, name: 'ホテル京都', location: '京都市中京区', regularPrice: '¥18,000/泊', lowestPrice: '¥16,200', image: 'https://source.unsplash.com/featured/?hotel,Kyoto', description: '歴史と伝統が息づく京都で、贅沢な時間をお過ごしください。' },
  { id: 4, name: 'ホテル福岡', location: '福岡市中央区', regularPrice: '¥13,000/泊', lowestPrice: '¥11,700', image: 'https://source.unsplash.com/featured/?hotel,Fukuoka', description: '福岡の美食と文化を楽しめる魅力的なホテルです。' },
  { id: 5, name: 'ホテル札幌', location: '札幌市中央区', regularPrice: '¥14,000/泊', lowestPrice: '¥12,600', image: 'https://source.unsplash.com/featured/?hotel,Sapporo', description: '札幌の雪景色と都市の利便性を両立したホテル。' }
];

// ホーム（index）
app.get('/', (req, res) => {
  res.render('index', { hotels });
});

// アカウント登録
app.get('/register', (req, res) => {
  res.render('register', { error: null, success: null });
});
app.post('/register', (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.render('register', { error: 'パスワードが一致しません。', success: null });
  }
  if (users[email]) {
    return res.render('register', { error: 'このメールアドレスは既に登録されています。', success: null });
  }
  users[email] = { name, email, password };
  res.render('register', { success: '登録が完了しました。ログインしてください。', error: null });
});

// ログイン
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users[email];
  if (!user || user.password !== password) {
    return res.render('login', { error: 'メールアドレスまたはパスワードが正しくありません。' });
  }
  // セッション管理（簡易版）
  req.session = { user: email };
  res.redirect('/');
});

// ホテル詳細
app.get('/hotel', (req, res) => {
  const hotelId = parseInt(req.query.id);
  const hotel = hotels.find(h => h.id === hotelId);
  if (!hotel) {
    return res.send('ホテル情報が見つかりません。');
  }
  res.render('hotel', { hotel });
});

// 予約フォーム（GET）
app.get('/booking', (req, res) => {
  const hotelId = parseInt(req.query.id);
  const hotel = hotels.find(h => h.id === hotelId);
  if (!hotel) {
    return res.send('ホテル情報が見つかりません。');
  }
  res.render('booking', { hotel, error: null, success: null });
});

// 予約送信（POST）
app.post('/booking', (req, res) => {
  const { hotelId, checkin, checkout, guests, roomType } = req.body;
  const hotel = hotels.find(h => h.id === parseInt(hotelId));
  if (!hotel) {
    return res.send('ホテル情報が見つかりません。');
  }
  if (new Date(checkout) <= new Date(checkin)) {
    return res.render('booking', { hotel, error: 'チェックアウト日はチェックイン日より後にしてください。', success: null });
  }
  const booking = { hotelId, checkin, checkout, guests, roomType, time: new Date() };
  bookings.push(booking);

  // Discord Webhook へ送信
  const payload = {
    content: null,
    embeds: [
      {
        title: "新規予約",
        description: "予約が完了しました。",
        fields: [
          { name: "ホテル", value: hotel.name, inline: true },
          { name: "チェックイン", value: checkin, inline: true },
          { name: "チェックアウト", value: checkout, inline: true },
          { name: "人数", value: guests, inline: true },
          { name: "部屋タイプ", value: roomType, inline: true }
        ],
        color: 3447003
      }
    ]
  };

  fetch("https://discord.com/api/webhooks/1352736309080494182/kHQ4Rzrns2DQ7Li85mJaJ797vbiVg0Da2APyMPJkOgXbxIsT3QDqGhr_4-U_Rp4Vin7T", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) throw new Error("Webhook送信エラー");
    res.render('booking', { hotel, error: null, success: '予約が完了しました。ありがとうございます！' });
  })
  .catch(err => {
    console.error(err);
    res.render('booking', { hotel, error: '予約の送信に失敗しました。再度お試しください。', success: null });
  });
});

// お問い合わせ
app.get('/contact', (req, res) => {
  res.render('contact', { success: null });
});
app.post('/contact', (req, res) => {
  // デモ用：実際はメール送信などを実装
  res.render('contact', { success: 'お問い合わせ内容を送信しました。' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
