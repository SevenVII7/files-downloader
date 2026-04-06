const fs = require('fs');
const path = require('path');
const axios = require('axios');

const code = 1154141
const page = 22
const exc = 'jpg'
const downloadDir = './[V-SLASH (夕霧)] Lust Ritual 性なる生贄';

// 1. 你的圖片網址清單
const imageUrls = () => {
  const result = []
  for (let i=1; i<page+1; i++){
    result.push(`https://i2.nhentai.net/galleries/${code}/${i}.${exc}`)
  }
  return result
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 2. 下載單張圖片的函式
async function downloadImage(url, folder) {
  try {
    const fileName = path.basename(url).split('?')[0]; // 取得檔名並去除 URL 參數
    const filePath = path.join(folder, fileName);
    
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (err) {
    console.error(`下載失敗: ${url}`, err.message);
  }
}

// 3. 主程序：批量處理
async function main() {
  const arr = imageUrls()
  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

  // --- 統計變數 ---
  let successCount = 0;
  let failCount = 0;
  const failedUrls = [];

  console.log(`預計下載 ${arr.length} 張圖片...`);

  // 使用 for 迴圈才能確保「按順序」執行
  for (let i = 0; i < arr.length; i++) {
    const url = arr[i];
    
    try {
      console.log(`[${i + 1}/${arr.length}] 正在下載: ${url}`);
      await downloadImage(url, downloadDir);
      successCount++;
    } catch (err) {
      console.error(`❌ 下載失敗: ${url} (原因: ${err.message})`);
      failCount++;
      failedUrls.push(url);
    }

    // 間隔 1 秒
    if (i < arr.length - 1) {
      await sleep(500); 
    }
  }

  // --- 最終判斷與結算 ---
  console.log('\n-------------------------------------------');
  console.log('📊 下載任務結算：');
  console.log(`✅ 成功：${successCount} 張`);
  console.log(`❌ 失敗：${failCount} 張`);

  if (failCount === 0) {
    console.log('🎉 太棒了！清單中的圖片已「全部下載成功」。');
  } else {
    console.log('⚠️ 注意：有部分圖片下載失敗。');
    console.log('失敗清單如下：');
    failedUrls.forEach((url, index) => console.log(`   ${index + 1}. ${url}`));
  }
  console.log('-------------------------------------------');
}

main();