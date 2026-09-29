import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'hi' | 'mr';
const messages: Record<Language, Record<string, string>> = {
  en: {
    language: 'Language', english: 'English', hindi: 'हिन्दी', marathi: 'मराठी',
    collector: 'Collector', pickupQueue: 'Pickup queue', safetyGuide: 'Safety guide', earnings: 'Earnings',
    online: 'Online', offline: 'Offline', syncing: 'Syncing', syncNow: 'Sync now',
    draft: 'Draft', queued: 'Queued', synced: 'Synced', failed: 'Failed',
    saveDraft: 'Save draft', submitCollection: 'Finish collection', retry: 'Retry',
    queueCollection: 'Save to sync queue', recordCollection: 'Record collection', draftSaved: 'Draft saved on this device',
    doorstepWeigh: 'Weigh pickup', wasteId: 'Pickup ID', scaleInput: 'Scale reading', readingScale: 'Reading scale…', syncScale: 'Read scale', liveWeight: 'Weight', citizenPayout: 'Payout', paymentMethod: 'Payment method', cashPaid: 'Cash is marked paid. UPI and bank transfer stay pending until confirmed.', customerPin: 'Customer PIN', enterPin: 'Enter 4-digit PIN',
    navDashboard: 'My dashboard', navBook: 'Book pickup', navRates: 'Rates', navPrices: 'Price board', navTrack: 'Track', navHome: 'Home', navIdentity: 'Identity', navQueue: 'Pickup queue', navOverview: 'Overview', navImpact: 'Impact', navBatches: 'Batches',
    offlineDraftNote: 'Saved on this device. Not sent to the server.', queuedNote: 'Waiting to sync. The server has not confirmed this collection.',
    speechOn: 'Read aloud', speechOff: 'Stop reading',
    safetyTitle: 'Safety guide', safetyIntro: 'Stop work and ask for help if anything feels unsafe.', doLabel: 'DO', dontLabel: 'DON’T',
    batteries: 'Batteries', crt: 'CRT screens', pcbs: 'Circuit boards', cables: 'Cables', electrical: 'Electrical hazards', sharp: 'Sharp materials', burning: 'Burning waste', chemicals: 'Chemical hazards',
    batteryDo: 'Keep terminals apart. Store dry in a separate box.', batteryDont: 'Do not crush, puncture, heat, or mix damaged batteries.',
    crtDo: 'Keep the screen upright. Ask for help to move it.', crtDont: 'Do not break the glass or remove the back cover.',
    pcbDo: 'Keep boards dry. Use gloves and a separate container.', pcbDont: 'Do not burn boards or touch leaked parts.',
    cableDo: 'Coil cables gently. Keep plugs disconnected.', cableDont: 'Do not burn cables or strip insulation with fire.',
    electricalDo: 'Keep away from live wires. Call the power provider or supervisor.', electricalDont: 'Do not touch, move, or pour water on live equipment.',
    sharpDo: 'Use thick gloves and a rigid, labelled container.', sharpDont: 'Do not pick up needles or broken glass by hand.',
    burningDo: 'Move away from smoke. Warn people and call emergency help.', burningDont: 'Do not breathe smoke or try to put out an unknown fire.',
    chemicalDo: 'Step away, avoid contact, and notify the supervisor.', chemicalDont: 'Do not smell, mix, touch, or pour chemicals into drains.',
    noPickups: 'No active pickups', queuedCount: 'Waiting to sync', localOnly: 'On this device only', syncFailed: 'Needs attention',
    todayPickups: "Today's pickups", dailyGoal: 'Daily goal', todayEarnings: "Today's earnings", paymentRecorded: 'Payment status in ledger', pendingPickups: 'Waiting pickups', nearby: 'Nearby', completedPickups: 'Completed pickups', weighed: 'Weight recorded', activePickup: 'Active pickup', weigh: 'Weigh & finish', activeOnly: 'New requests appear here', accept: 'Accept', navigate: 'Navigate', allNearbyDone: 'No nearby pickups', newBookings: 'New pickup requests appear here.', recentCollections: 'Recent collections',
    finance: 'Collector finance', earningsLedger: 'Earnings ledger', ledgerHelp: 'Completed pickup transactions. Pending is separate from paid.', refresh: 'Refresh', totalEarnings: 'Total earnings', paid: 'Paid', pending: 'Pending', transactionsWeight: 'Transactions · weight', from: 'From', to: 'To', paymentStatus: 'Payment status', allStatuses: 'All statuses', material: 'Material', allMaterials: 'All materials', monthlyEarnings: 'Monthly earnings', monthlyHelp: 'Paid, pending and failed by month', materialEarnings: 'Earnings by material', materialHelp: 'Recorded value by material', transactionHistory: 'Transaction history', dateTransaction: 'Date / transaction', weight: 'Weight', amount: 'Amount', method: 'Method', noTransactions: 'No transactions match these filters.', paymentProviderNote: 'UPI and Jan-Dhan remain pending until settlement is confirmed.',
    loading: 'Loading…', noChartData: 'No data for these filters.', status: 'Status',
  },
  hi: {
    language: 'भाषा', english: 'English', hindi: 'हिन्दी', marathi: 'मराठी',
    collector: 'कलेक्टर', pickupQueue: 'पिकअप सूची', safetyGuide: 'सुरक्षा मार्गदर्शिका', earnings: 'कमाई',
    online: 'ऑनलाइन', offline: 'ऑफ़लाइन', syncing: 'सिंक हो रहा है', syncNow: 'अभी सिंक करें',
    draft: 'ड्राफ़्ट', queued: 'कतार में', synced: 'सिंक हुआ', failed: 'विफल',
    saveDraft: 'ड्राफ़्ट सहेजें', submitCollection: 'संग्रह पूरा करें', retry: 'फिर कोशिश करें',
    queueCollection: 'सिंक कतार में रखें', recordCollection: 'संग्रह दर्ज करें', draftSaved: 'ड्राफ़्ट इस डिवाइस पर सहेजा गया',
    doorstepWeigh: 'पिकअप तौलें', wasteId: 'पिकअप आईडी', scaleInput: 'वज़न माप', readingScale: 'वज़न पढ़ रहा है…', syncScale: 'वज़न पढ़ें', liveWeight: 'वज़न', citizenPayout: 'भुगतान', paymentMethod: 'भुगतान तरीका', cashPaid: 'नकद मिला माना जाएगा। UPI और बैंक भुगतान पुष्टि तक बाकी रहेंगे।', customerPin: 'ग्राहक PIN', enterPin: '4 अंकों का PIN लिखें',
    navDashboard: 'मेरा डैशबोर्ड', navBook: 'पिकअप बुक करें', navRates: 'भाव', navPrices: 'भाव सूची', navTrack: 'ट्रैक करें', navHome: 'होम', navIdentity: 'पहचान', navQueue: 'पिकअप सूची', navOverview: 'अवलोकन', navImpact: 'प्रभाव', navBatches: 'लॉट',
    offlineDraftNote: 'इस डिवाइस पर सहेजा। सर्वर को नहीं भेजा गया।', queuedNote: 'सिंक की प्रतीक्षा में। सर्वर ने संग्रह की पुष्टि नहीं की है।',
    speechOn: 'बोलकर सुनें', speechOff: 'पढ़ना रोकें',
    safetyTitle: 'सुरक्षा मार्गदर्शिका', safetyIntro: 'असुरक्षित लगे तो काम रोकें और मदद लें।', doLabel: 'करें', dontLabel: 'न करें',
    batteries: 'बैटरियाँ', crt: 'CRT स्क्रीन', pcbs: 'सर्किट बोर्ड', cables: 'केबल', electrical: 'बिजली का ख़तरा', sharp: 'नुकीली वस्तुएँ', burning: 'जलता कचरा', chemicals: 'रसायन का ख़तरा',
    batteryDo: 'टर्मिनल अलग रखें। सूखी जगह में अलग डिब्बे में रखें।', batteryDont: 'बैटरी को कुचलें, छेदें, गर्म करें या क्षतिग्रस्त बैटरी न मिलाएँ।',
    crtDo: 'स्क्रीन सीधी रखें। उठाने के लिए मदद लें।', crtDont: 'काँच न तोड़ें और पीछे का कवर न खोलें।',
    pcbDo: 'बोर्ड सूखे रखें। दस्ताने और अलग डिब्बा इस्तेमाल करें।', pcbDont: 'बोर्ड न जलाएँ और रिसे हुए हिस्से न छुएँ।',
    cableDo: 'केबल धीरे से लपेटें। प्लग निकले होने चाहिए।', cableDont: 'केबल न जलाएँ और आग से तार न छीलें।',
    electricalDo: 'चालू तारों से दूर रहें। बिजली विभाग या सुपरवाइज़र को बुलाएँ।', electricalDont: 'चालू उपकरण न छुएँ, न हटाएँ और पानी न डालें।',
    sharpDo: 'मोटे दस्ताने और मज़बूत, लेबल वाला डिब्बा इस्तेमाल करें।', sharpDont: 'सुई या टूटा काँच हाथ से न उठाएँ।',
    burningDo: 'धुएँ से दूर जाएँ। लोगों को चेताएँ और आपात सहायता बुलाएँ।', burningDont: 'धुआँ न लें और अनजान आग बुझाने की कोशिश न करें।',
    chemicalDo: 'दूर हटें, छूने से बचें और सुपरवाइज़र को बताएँ।', chemicalDont: 'रसायन को सूँघें, मिलाएँ, छुएँ या नाली में न डालें।',
    noPickups: 'कोई सक्रिय पिकअप नहीं', queuedCount: 'सिंक की प्रतीक्षा में', localOnly: 'केवल इस डिवाइस पर', syncFailed: 'ध्यान दें',
    todayPickups: 'आज के पिकअप', dailyGoal: 'आज का लक्ष्य', todayEarnings: 'आज की कमाई', paymentRecorded: 'भुगतान की स्थिति', pendingPickups: 'बाकी पिकअप', nearby: 'पास में', completedPickups: 'पूरे पिकअप', weighed: 'वज़न दर्ज', activePickup: 'चालू पिकअप', weigh: 'तौलें और पूरा करें', activeOnly: 'नए अनुरोध यहाँ दिखेंगे', accept: 'स्वीकारें', navigate: 'रास्ता देखें', allNearbyDone: 'पास में पिकअप नहीं', newBookings: 'नए पिकअप अनुरोध यहाँ दिखेंगे।', recentCollections: 'हाल के संग्रह',
    finance: 'कलेक्टर भुगतान', earningsLedger: 'कमाई का ब्योरा', ledgerHelp: 'पूरे हुए पिकअप। बाकी भुगतान अलग दिखता है।', refresh: 'रीफ़्रेश', totalEarnings: 'कुल कमाई', paid: 'मिला', pending: 'बाकी', transactionsWeight: 'लेन-देन · वज़न', from: 'से', to: 'तक', paymentStatus: 'भुगतान स्थिति', allStatuses: 'सभी स्थितियाँ', material: 'सामग्री', allMaterials: 'सभी सामग्री', monthlyEarnings: 'महीने की कमाई', monthlyHelp: 'हर महीने मिला, बाकी और विफल', materialEarnings: 'सामग्री के अनुसार कमाई', materialHelp: 'सामग्री के अनुसार दर्ज मूल्य', transactionHistory: 'लेन-देन सूची', dateTransaction: 'तारीख / लेन-देन', weight: 'वज़न', amount: 'राशि', method: 'तरीका', noTransactions: 'इन फ़िल्टर में लेन-देन नहीं मिले।', paymentProviderNote: 'UPI और जन-धन भुगतान की पुष्टि तक बाकी रहेंगे।',
    loading: 'लोड हो रहा है…', noChartData: 'इन फ़िल्टर में डेटा नहीं है।', status: 'स्थिति',
  },
  mr: {
    language: 'भाषा', english: 'English', hindi: 'हिन्दी', marathi: 'मराठी',
    collector: 'कलेक्टर', pickupQueue: 'पिकअप यादी', safetyGuide: 'सुरक्षा मार्गदर्शक', earnings: 'कमाई',
    online: 'ऑनलाइन', offline: 'ऑफलाइन', syncing: 'सिंक सुरू', syncNow: 'आता सिंक करा',
    draft: 'मसुदा', queued: 'रांगेत', synced: 'सिंक झाले', failed: 'अयशस्वी',
    saveDraft: 'मसुदा जतन करा', submitCollection: 'संकलन पूर्ण करा', retry: 'पुन्हा प्रयत्न करा',
    queueCollection: 'सिंक रांगेत ठेवा', recordCollection: 'संकलन नोंदवा', draftSaved: 'मसुदा या उपकरणावर जतन केला',
    doorstepWeigh: 'पिकअपचे वजन करा', wasteId: 'पिकअप आयडी', scaleInput: 'वजन मोजमाप', readingScale: 'वजन वाचत आहे…', syncScale: 'वजन वाचा', liveWeight: 'वजन', citizenPayout: 'पेमेंट', paymentMethod: 'पेमेंट पद्धत', cashPaid: 'रोख पेमेंट मिळाले मानले जाईल. UPI आणि बँक पेमेंट पुष्टी होईपर्यंत बाकी राहतील.', customerPin: 'ग्राहक PIN', enterPin: '४ अंकी PIN टाका',
    navDashboard: 'माझे डॅशबोर्ड', navBook: 'पिकअप बुक करा', navRates: 'दर', navPrices: 'भाव सूची', navTrack: 'ट्रॅक करा', navHome: 'मुख्यपृष्ठ', navIdentity: 'ओळख', navQueue: 'पिकअप यादी', navOverview: 'आढावा', navImpact: 'परिणाम', navBatches: 'लॉट',
    offlineDraftNote: 'या उपकरणावर जतन केले. सर्व्हरला पाठवलेले नाही.', queuedNote: 'सिंक होण्याची वाट पाहत आहे. सर्व्हरने संकलनाची पुष्टी केलेली नाही.',
    speechOn: 'मोठ्याने वाचा', speechOff: 'वाचणे थांबवा',
    safetyTitle: 'सुरक्षा मार्गदर्शक', safetyIntro: 'असुरक्षित वाटल्यास काम थांबवा आणि मदत मागा.', doLabel: 'करा', dontLabel: 'करू नका',
    batteries: 'बॅटरी', crt: 'CRT पडदे', pcbs: 'सर्किट बोर्ड', cables: 'केबल', electrical: 'विद्युत धोका', sharp: 'टोकदार वस्तू', burning: 'जळणारा कचरा', chemicals: 'रासायनिक धोका',
    batteryDo: 'टर्मिनल वेगळे ठेवा. कोरड्या जागी स्वतंत्र डब्यात ठेवा.', batteryDont: 'बॅटरी चिरडू, छिद्रू किंवा गरम करू नका. खराब बॅटरी एकत्र ठेवू नका.',
    crtDo: 'पडदा सरळ ठेवा. हलवताना मदत घ्या.', crtDont: 'काच फोडू नका किंवा मागचे आवरण उघडू नका.',
    pcbDo: 'बोर्ड कोरडे ठेवा. हातमोजे आणि वेगळा डबा वापरा.', pcbDont: 'बोर्ड जाळू नका किंवा गळतीचे भाग हाताळू नका.',
    cableDo: 'केबल अलगद गुंडाळा. प्लग जोडलेले नसावेत.', cableDont: 'केबल जाळू नका किंवा आगीने आवरण काढू नका.',
    electricalDo: 'जिवंत तारांपासून दूर राहा. वीज विभाग किंवा पर्यवेक्षकाला बोलवा.', electricalDont: 'चालू उपकरणाला हात लावू, हलवू किंवा पाणी टाकू नका.',
    sharpDo: 'जाड हातमोजे आणि मजबूत, लेबल असलेला डबा वापरा.', sharpDont: 'सुई किंवा फुटलेली काच हाताने उचलू नका.',
    burningDo: 'धुरापासून दूर जा. लोकांना सावध करा आणि आपत्कालीन मदत बोलवा.', burningDont: 'धूर श्वासात घेऊ नका किंवा अनोळखी आग विझवण्याचा प्रयत्न करू नका.',
    chemicalDo: 'दूर व्हा, संपर्क टाळा आणि पर्यवेक्षकाला कळवा.', chemicalDont: 'रसायन हुंगू, मिसळू, स्पर्श करू किंवा नाल्यात ओतू नका.',
    noPickups: 'सध्या सक्रिय पिकअप नाहीत', queuedCount: 'सिंक होण्याची प्रतीक्षा', localOnly: 'फक्त या उपकरणावर', syncFailed: 'लक्ष द्या',
    todayPickups: 'आजचे पिकअप', dailyGoal: 'आजचे ध्येय', todayEarnings: 'आजची कमाई', paymentRecorded: 'पेमेंटची स्थिती', pendingPickups: 'बाकी पिकअप', nearby: 'जवळ', completedPickups: 'पूर्ण पिकअप', weighed: 'वजन नोंदले', activePickup: 'सुरू पिकअप', weigh: 'वजन करा आणि पूर्ण करा', activeOnly: 'नवीन विनंत्या येथे दिसतील', accept: 'स्वीकारा', navigate: 'मार्ग पहा', allNearbyDone: 'जवळ पिकअप नाहीत', newBookings: 'नवीन पिकअप विनंत्या येथे दिसतील.', recentCollections: 'अलीकडील संकलन',
    finance: 'कलेक्टर पेमेंट', earningsLedger: 'कमाई नोंद', ledgerHelp: 'पूर्ण झालेले पिकअप. बाकी पेमेंट वेगळे दिसते.', refresh: 'रिफ्रेश', totalEarnings: 'एकूण कमाई', paid: 'मिळाले', pending: 'बाकी', transactionsWeight: 'व्यवहार · वजन', from: 'पासून', to: 'पर्यंत', paymentStatus: 'पेमेंट स्थिती', allStatuses: 'सर्व स्थिती', material: 'साहित्य', allMaterials: 'सर्व साहित्य', monthlyEarnings: 'महिन्याची कमाई', monthlyHelp: 'महिन्यानुसार मिळालेले, बाकी आणि अयशस्वी', materialEarnings: 'साहित्यानुसार कमाई', materialHelp: 'साहित्यानुसार नोंदलेले मूल्य', transactionHistory: 'व्यवहार यादी', dateTransaction: 'तारीख / व्यवहार', weight: 'वजन', amount: 'रक्कम', method: 'पद्धत', noTransactions: 'या फिल्टरमध्ये व्यवहार नाहीत.', paymentProviderNote: 'UPI आणि जन-धन पेमेंटची पुष्टी होईपर्यंत बाकी राहतील.',
    loading: 'लोड होत आहे…', noChartData: 'या फिल्टरमध्ये माहिती नाही.', status: 'स्थिती',
  },
};

interface I18nValue { language: Language; setLanguage: (language: Language) => void; t: (key: string) => string; }
const I18nContext = createContext<I18nValue | null>(null);
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('scraplink_language');
    return saved === 'hi' || saved === 'mr' ? saved : 'en';
  });
  const setLanguage = (next: Language) => { localStorage.setItem('scraplink_language', next); setLanguageState(next); };
  useEffect(() => { document.documentElement.lang = language === 'hi' ? 'hi' : language === 'mr' ? 'mr' : 'en'; }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key: string) => messages[language][key] ?? messages.en[key] ?? key }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
export function useI18n() { const value = useContext(I18nContext); if (!value) throw new Error('useI18n must be used within I18nProvider'); return value; }
