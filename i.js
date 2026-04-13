const fs = require('fs')
const path = require('path')
const axios = require('axios')
const express = require('express')
const app = express()
const PORT = process.env.PORT || 8979

// 1. 依參數產生圖片網址清單
// const imageUrls = ({ url, indexStart, indexEnd, exc }) => {
//   const result = []
//   if (!indexStart || !indexEnd) {
//     result.push(`${url}.${exc}`)
//   } else {
//     for (let i = indexStart; i <= indexEnd; i++) {
//       result.push(`${url}/${i}.${exc}`)
//     }
//   }
//   return result
// }

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// 2. 下載單張圖片的函式
async function downloadImage(url, folder) {
  try {
    const fileName = path.basename(url).split('?')[0] // 取得檔名並去除 URL 參數
    const filePath = path.join(folder, fileName)

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    })

    const writer = fs.createWriteStream(filePath)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  } catch (err) {
    console.error(`下載失敗: ${url}`, err.message)
  }
}

// 3. 主程序：批量處理
async function main({ urls, downloadDir }) {
  // const arr = imageUrls({ url, indexStart, indexEnd, exc })

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true })
  }

  // --- 統計變數 ---
  let successCount = 0
  let failCount = 0
  const failedUrls = []

  console.log(`預計下載 ${urls.length} 張圖片...`)

  // 使用 for 迴圈才能確保「按順序」執行
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]

    try {
      console.log(`[${i + 1}/${urls.length}] 正在下載: ${url}`)
      await downloadImage(url, downloadDir)
      successCount++
    } catch (err) {
      console.error(`❌ 下載失敗: ${url} (原因: ${err.message})`)
      failCount++
      failedUrls.push(url)
    }

    // 間隔 1 秒
    if (i < urls.length - 1) {
      await sleep(500)
    }
  }

  // --- 最終判斷與結算 ---
  let message = `
    \r\n-------------------------------------------
    \r\n📊 下載任務結算：
    \r\n✅ 成功：${successCount} 張
    \r\n❌ 失敗：${failCount} 張
    \r\n-------------------------------------------
  `

  if (failCount === 0) {
    message += '\r\n🎉 太棒了！清單中的圖片已「全部下載成功」。'
  } else {
    message += '\r\n⚠️ 注意：有部分圖片下載失敗。'
    message += '\r\n失敗清單如下：'
    failedUrls.forEach((url, index) => (message += `\r\n${index + 1}. ${url}`))
  }
  message += '\r\n-------------------------------------------'
  console.log(message)

  return {
    total: urls.length,
    successCount,
    failCount,
    failedUrls,
    message
  }
}

app.use(express.json())

app.post('/dl-files', async (req, res) => {
  const { urls, downloadDir } = req.body

  if (!urls || !urls.length || !downloadDir) {
    return res.status(400).json({
      message: '缺少必要參數，請提供 urls、downloadDir'
    })
  }

  try {
    const result = await main({
      urls,
      downloadDir
    })
    return res.json({
      message: '下載任務完成',
      ...result
    })
  } catch (err) {
    console.error('下載任務執行失敗:', err.message)
    return res.status(500).json({
      message: '下載任務執行失敗',
      error: err.message
    })
  }
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
