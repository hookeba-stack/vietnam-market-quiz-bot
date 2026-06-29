// Service to interact with Google Drive API for the public folder
// Folder URL: https://drive.google.com/drive/folders/1SNRth-9rYzOIz-HUUySwqH3iTulsKu3D

const FOLDER_ID = '1SNRth-9rYzOIz-HUUySwqH3iTulsKu3D';

// Fallback list of files captured during initial scan, ensuring the app works 
// even if Google Drive API credentials are not configured or block public listing.
const STATIC_DRIVE_FILES = [
  { id: '1-1_REPORT_DIGITAL_VIETNAM_2025', name: 'Copy of [REPORT] DIGITAL VIETNAM 2025 shared by VN Market Report.pdf' },
  { id: '1-2_2025_E-Commerce_Trends', name: 'Copy of 2025 E-Commerce Trends Report Business Edit_DHL eCommerce.pdf' },
  { id: '1-3_Beverage-Market', name: 'Copy of 2504-Beverage-Market-0425.pdf' },
  { id: '1-4_Vietnam_Digital_Landscape', name: 'Copy of AnyMind - Vietnam Digital Landscape 2025.pdf' },
  { id: '1-5_Retail_Pharmacy', name: 'Copy of Báo cáo ngành Bán lẻ dược phẩm.pdf' },
  { id: '1-6_Beer_Industry', name: 'Copy of Báo cáo ngành Bia.pdf' },
  { id: '1-7_Household_Appliances', name: 'Copy of Báo cáo ngành Đồ gia dụng.pdf' },
  { id: '1-8_Paytech_Industry', name: 'Copy of Báo cáo ngành Paytech.pdf' },
  { id: '1-9_Chinese_Car_Market', name: 'Copy of Báo cáo thị trường xe ô tô trung quốc.pdf' },
  { id: '1-10_Household_Appliances_2024', name: 'Copy of Bao-cao-nganh-hang-gia-dung-Viet-Nam-2024.pdf' },
  { id: '1-11_BCG_Consumer_Touchpoints', name: 'Copy of BCG - Mapping Consumer Touchpoints That Influence Decisions.pdf' },
  { id: '1-12_FMCG_Trends_2026', name: 'Copy of FMCG_Gurus_Top_Ten_Trends_for_2026-Trend_Digest.pdf' },
  { id: '1-13_KOMPA_Cosmetics_2025', name: 'Copy of KOMPA_Thị trường mỹ phẩm 2025.pdf' },
  { id: '1-14_Nielsen_Tet_2026', name: 'Copy of Nielsen IQ - Tết 2026 - report 25July09.pdf' },
  { id: '1-15_LED_Outdoor', name: 'Copy of PCR - LED outdoor_ VietNam _ Aug2023.pdf' },
  { id: '1-16_Coffee_Shop_H1_2025', name: 'Copy of Snapshot report - Thị trường Chuỗi Coffee Shop H1_2025.pdf' },
  { id: '1-17_State_of_Fashion_2025', name: 'Copy of the-state-of-fashion-2025-v2.pdf' },
  { id: '1-18_Future_Shopper', name: 'Copy of TheFutureShopper_VML.pdf' },
  { id: '1-19_Consumer_Trends_VADs', name: 'Copy of VADs2025_ Vietnam Consumer Trends 2025.pdf' },
  { id: '1-20_Baby_Diaper_Market', name: 'Copy of Vietnam Baby Diaper Market.pdf' },
  { id: '1-21_Vietnam_Consumer_Trends', name: 'Copy of Vietnam Consumer Trends 2025.pdf' },
  { id: '1-22_ECommerce_FastForward', name: 'Copy of Vietnam E-Commerce 2025 - Fast-Forward into the Future.pdf' },
  { id: '1-23_Hair_Care_Market', name: 'Copy of VIETNAM HAIR CARE MARKET_from Insights Asia Mar 2025.pdf' },
  { id: '1-24_Skincare_Market', name: 'Copy of Vietnam Skincare Market Report_Jul 2025.pdf' },
  { id: '1-25_Supermarket_Behavior', name: 'Copy of Vietnam Supermarket and Hypermarket Industry - Consumer Behavior and Brand Perception Study.pdf' },
  { id: '1-26_Tet_Playbook', name: 'Copy of Vietnam Tet 2026 Brand Growth Playbook.pdf' },
  { id: '1-27_Food_Drink_Report', name: 'Copy of vietnam-food-drink-report.pdf' },
  { id: '1-28_Social_Commerce', name: 'Copy of Vietnamese Social Commerce Discovery & Purchase Behavior.pdf' },
  { id: '1-29_VinaCapital_2026', name: 'Copy of Vinacapital - Strategic Report 2026.pdf' },
  { id: '1-30_Street_Food', name: 'Copy of VN Street Food.pdf' },
  { id: '1-31_Where_Consumers_Shop', name: 'Copy of Where do Vietnamese consumers shop.pdf' }
];

/**
 * Fetch the list of files in the Google Drive folder
 * Uses the API key if configured, falls back to the static list + user custom inputs if API fails.
 */
export async function getDriveFiles() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("No GOOGLE_DRIVE_API_KEY or GEMINI_API_KEY found, falling back to static file list.");
    return STATIC_DRIVE_FILES;
  }

  try {
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+trashed=false&key=${apiKey}&fields=files(id,name,mimeType,webViewLink)&pageSize=100`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      // Filter only PDF and Document files if needed, or return all
      return data.files.map(file => ({
        id: file.id,
        name: file.name,
        webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`
      }));
    }
    
    return STATIC_DRIVE_FILES;
  } catch (error) {
    console.error("Failed to fetch from Google Drive API, using fallback list:", error.message);
    return STATIC_DRIVE_FILES;
  }
}

/**
 * Returns a direct download link for a file ID in Google Drive
 */
export function getDownloadUrl(fileId) {
  // If it's one of our static IDs, they are placeholders, so we return a placeholder data link
  if (fileId.startsWith('1-')) {
    return null;
  }
  return `https://docs.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Downloads a file from Google Drive and returns it as a Buffer / Base64 for Gemini API ingestion
 */
export async function downloadDriveFile(fileId) {
  const downloadUrl = getDownloadUrl(fileId);
  if (!downloadUrl) {
    return null; // For static files, we won't download but will let Gemini generate based on title/context
  }

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error downloading Google Drive file ${fileId}:`, error.message);
    return null;
  }
}
