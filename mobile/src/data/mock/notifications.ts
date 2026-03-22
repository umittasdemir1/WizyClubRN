export interface Notification {
    id: string;
    type: 'deal' | 'social' | 'like' | 'default';
    title: string;
    desc: string;
    time: string;
    read: boolean;
}

export const MOCK_NOTIFICATIONS: Notification[] = [
    { id: '1', type: 'deal', title: 'Zara İndirimi Başladı!', desc: 'Favori ürünlerinde %40 indirim seni bekliyor.', time: '2dk', read: false },
    { id: '2', type: 'social', title: '@karennne seni takip etti', desc: 'Senin videolarını beğeniyor olabilir.', time: '15dk', read: false },
    { id: '3', type: 'like', title: 'Videon 10k izlendi!', desc: 'Tebrikler, bu hafta çok popülersin.', time: '1sa', read: false },
    { id: '4', type: 'deal', title: 'Kupon Süresi Doluyor', desc: 'Starbucks kodunu kullanmak için son 2 saat.', time: '3sa', read: false },
    { id: '5', type: 'social', title: '@umit bir video paylaştı', desc: 'İlgini çekebilecek yeni bir içerik.', time: '5sa', read: false },
    { id: '6', type: 'like', title: '500 yeni takipçi!', desc: 'Bu hafta harika gidiyorsun.', time: '6sa', read: false },
    { id: '7', type: 'deal', title: 'Nike Flash Sale', desc: 'Sadece 24 saat, %60 indirim.', time: '7sa', read: false },
    { id: '8', type: 'social', title: '@moda seni takip etti', desc: 'Yeni bir hayranın var!', time: '8sa', read: false },
    { id: '9', type: 'like', title: 'Yorumuna 100 beğeni!', desc: 'İnsanlar seni seviyor.', time: '9sa', read: false },
    { id: '10', type: 'deal', title: 'H&M Özel Fırsat', desc: 'Üye olanlara %30 ekstra.', time: '10sa', read: false },
    { id: '11', type: 'social', title: '@style seni etiketledi', desc: 'Bir gönderide bahsedildin.', time: '11sa', read: true },
];
