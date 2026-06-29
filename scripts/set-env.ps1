$envVars = @{
    "GEMINI_API_KEY" = "AIzaSyBwHOgoRldUZhDFvh7EoKZbSDmyVKUl2nM"
    "SUPABASE_URL" = "https://fbndspqraslcweczguye.supabase.co"
    "SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibmRzcHFyYXNsY3dlY3pndXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTIyMjcsImV4cCI6MjA5ODI4ODIyN30.rzd9LFYEK5qgGnxfQOFRTG7Xr9tuxaLZhS3unVNmHcQ"
    "ZALO_BOT_TOKEN" = "573853085825137296:itiJlHBZaklPOEQHlDYRLOgHjcjiCMcsePZHjuldUCcAMtfNhipaINKQuTuCtDLo"
    "CRON_SECRET" = "vietnam_market_quiz_bot_cron_secret_key_2026"
    "NEXT_PUBLIC_WEBAPP_URL" = "https://vietnam-market-quiz-bot.vercel.app"
}

foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    Write-Host "Adding $key ..."
    # Add to Production, Preview, Development
    $value | vercel env add $key production --force 2>&1
    $value | vercel env add $key preview --force 2>&1
    $value | vercel env add $key development --force 2>&1
    Write-Host "Done: $key"
}

Write-Host "`nAll environment variables added! Starting redeploy..."
vercel deploy --prod 2>&1
Write-Host "Redeploy triggered!"
