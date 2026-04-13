import fs from 'fs'
import path from 'path'
import axios from 'axios'
import express, { Request, Response } from 'express'

type MainParams = {
  urls: string[]
  downloadDir: string
}

type MainResult = {
  total: number
  successCount: number
  failCount: number
  failedUrls: string[]
  message: string
}

const app = express()
const PORT = Number(process.env.PORT) || 8979

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message
  return String(err)
}

async function downloadImage(url: string, folder: string): Promise<void> {
  const fileName = path.basename(url).split('?')[0]
  const filePath = path.join(folder, fileName)

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })

  const writer = fs.createWriteStream(filePath)
  response.data.pipe(writer)

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', () => resolve())
    writer.on('error', reject)
  })
}

async function main({ urls, downloadDir }: MainParams): Promise<MainResult> {
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true })
  }

  let successCount = 0
  let failCount = 0
  const failedUrls: string[] = []

  console.log(`預計下載 ${urls.length} 張圖片...`)

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]

    try {
      console.log(`[${i + 1}/${urls.length}] 正在下載: ${url}`)
      await downloadImage(url, downloadDir)
      successCount++
    } catch (err: unknown) {
      const errMessage = getErrorMessage(err)
      console.error(`❌ 下載失敗: ${url} (原因: ${errMessage})`)
      failCount++
      failedUrls.push(url)
    }

    if (i < urls.length - 1) {
      await sleep(500)
    }
  }

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
    failedUrls.forEach((failedUrl, index) => {
      message += `\r\n${index + 1}. ${failedUrl}`
    })
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

app.post('/dl-files', async (req: Request, res: Response) => {
  const { urls, downloadDir } = req.body as {
    urls?: unknown
    downloadDir?: unknown
  }

  if (
    !Array.isArray(urls) ||
    urls.length === 0 ||
    urls.some((item) => typeof item !== 'string') ||
    typeof downloadDir !== 'string' ||
    !downloadDir.trim()
  ) {
    return res.status(400).json({
      message: '缺少必要參數，請提供 urls(string[])、downloadDir(string)'
    })
  }

  try {
    const { total, successCount, failCount, failedUrls, message } = await main({
      urls,
      downloadDir
    })
    return res.json({
      total,
      successCount,
      failCount,
      failedUrls,
      message
    })
  } catch (err: unknown) {
    const errMessage = getErrorMessage(err)
    console.error('下載任務執行失敗:', errMessage)
    return res.status(500).json({
      message: '下載任務執行失敗',
      error: errMessage
    })
  }
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
