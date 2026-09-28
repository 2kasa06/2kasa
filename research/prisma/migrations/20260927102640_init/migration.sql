-- CreateEnum
CREATE TYPE "PriceInterval" AS ENUM ('MIN5', 'MIN15', 'DAY');

-- CreateEnum
CREATE TYPE "SignalTone" AS ENUM ('UP', 'DOWN', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "SignalStrength" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "FiscalPeriod" AS ENUM ('FY', 'Q1', 'Q2', 'Q3', 'Q4');

-- CreateEnum
CREATE TYPE "IrImportance" AS ENUM ('CRITICAL', 'IMPORTANT', 'NORMAL');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'REVIEW');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WEB_PUSH');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "ticker" TEXT,
    "market" TEXT NOT NULL,
    "sector" TEXT,
    "industry" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "sharesOutstanding" BIGINT,
    "peers" TEXT[],
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_prices" (
    "id" BIGSERIAL NOT NULL,
    "stockId" TEXT NOT NULL,
    "interval" "PriceInterval" NOT NULL DEFAULT 'DAY',
    "time" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(18,4) NOT NULL,
    "high" DECIMAL(18,4) NOT NULL,
    "low" DECIMAL(18,4) NOT NULL,
    "close" DECIMAL(18,4) NOT NULL,
    "volume" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_indicators" (
    "id" BIGSERIAL NOT NULL,
    "stockId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "value" DOUBLE PRECISION,
    "extra" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_signals" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tone" "SignalTone" NOT NULL,
    "strength" "SignalStrength" NOT NULL,
    "condition" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financials" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "period" "FiscalPeriod" NOT NULL,
    "periodEnd" DATE NOT NULL,
    "revenue" DOUBLE PRECISION,
    "operatingIncome" DOUBLE PRECISION,
    "ordinaryIncome" DOUBLE PRECISION,
    "netIncome" DOUBLE PRECISION,
    "eps" DOUBLE PRECISION,
    "bps" DOUBLE PRECISION,
    "totalAssets" DOUBLE PRECISION,
    "equity" DOUBLE PRECISION,
    "interestBearingDebt" DOUBLE PRECISION,
    "cash" DOUBLE PRECISION,
    "operatingCashFlow" DOUBLE PRECISION,
    "investingCashFlow" DOUBLE PRECISION,
    "dividendPerShare" DOUBLE PRECISION,
    "buyback" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "period" "FiscalPeriod" NOT NULL,
    "announcedAt" TIMESTAMP(3),
    "scheduledAt" DATE,
    "actual" JSONB,
    "companyForecast" JSONB,
    "consensus" JSONB,
    "consensusSource" TEXT,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ir_documents" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "importance" "IrImportance" NOT NULL DEFAULT 'NORMAL',
    "importanceReason" TEXT NOT NULL,
    "aiClassified" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT[],
    "summaryModel" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ir_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "media" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "category" TEXT NOT NULL,
    "groupKey" TEXT,
    "sentiment" "Sentiment",
    "aiClassified" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_stock_relations" (
    "newsId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,

    CONSTRAINT "news_stock_relations_pkey" PRIMARY KEY ("newsId","stockId")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_stocks" (
    "watchlistId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertRules" JSONB,

    CONSTRAINT "watchlist_stocks_pkey" PRIMARY KEY ("watchlistId","stockId")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "kind" TEXT NOT NULL,
    "stockCode" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "refs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_indices" (
    "id" BIGSERIAL NOT NULL,
    "indexId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "previousClose" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_indices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "macro_data" (
    "id" BIGSERIAL NOT NULL,
    "seriesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "previous" DOUBLE PRECISION,
    "unit" TEXT,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "macro_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "stockId" TEXT,
    "source" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis" (
    "id" TEXT NOT NULL,
    "stockId" TEXT,
    "kind" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtest_results" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "horizon" INTEGER NOT NULL,
    "samples" INTEGER NOT NULL,
    "mean" DOUBLE PRECISION,
    "median" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "min" DOUBLE PRECISION,
    "upRatio" DOUBLE PRECISION,
    "periodFrom" DATE NOT NULL,
    "periodTo" DATE NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backtest_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_code_key" ON "stocks"("code");

-- CreateIndex
CREATE INDEX "stocks_name_idx" ON "stocks"("name");

-- CreateIndex
CREATE INDEX "stocks_ticker_idx" ON "stocks"("ticker");

-- CreateIndex
CREATE INDEX "stock_prices_stockId_interval_time_idx" ON "stock_prices"("stockId", "interval", "time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "stock_prices_stockId_interval_time_key" ON "stock_prices"("stockId", "interval", "time");

-- CreateIndex
CREATE INDEX "technical_indicators_stockId_name_date_idx" ON "technical_indicators"("stockId", "name", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "technical_indicators_stockId_date_name_params_key" ON "technical_indicators"("stockId", "date", "name", "params");

-- CreateIndex
CREATE INDEX "technical_signals_stockId_date_idx" ON "technical_signals"("stockId", "date" DESC);

-- CreateIndex
CREATE INDEX "technical_signals_type_date_idx" ON "technical_signals"("type", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "technical_signals_stockId_type_date_key" ON "technical_signals"("stockId", "type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "financials_stockId_fiscalYear_period_key" ON "financials"("stockId", "fiscalYear", "period");

-- CreateIndex
CREATE INDEX "earnings_scheduledAt_idx" ON "earnings"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "earnings_stockId_fiscalYear_period_key" ON "earnings"("stockId", "fiscalYear", "period");

-- CreateIndex
CREATE INDEX "ir_documents_stockId_publishedAt_idx" ON "ir_documents"("stockId", "publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ir_documents_stockId_sourceUrl_key" ON "ir_documents"("stockId", "sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "news_url_key" ON "news"("url");

-- CreateIndex
CREATE INDEX "news_publishedAt_idx" ON "news"("publishedAt" DESC);

-- CreateIndex
CREATE INDEX "news_groupKey_idx" ON "news"("groupKey");

-- CreateIndex
CREATE INDEX "news_stock_relations_stockId_idx" ON "news_stock_relations"("stockId");

-- CreateIndex
CREATE INDEX "watchlists_userId_idx" ON "watchlists"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "market_indices_indexId_time_key" ON "market_indices"("indexId", "time");

-- CreateIndex
CREATE INDEX "macro_data_seriesId_releasedAt_idx" ON "macro_data"("seriesId", "releasedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "macro_data_seriesId_period_key" ON "macro_data"("seriesId", "period");

-- CreateIndex
CREATE INDEX "events_date_idx" ON "events"("date");

-- CreateIndex
CREATE INDEX "ai_analysis_stockId_kind_createdAt_idx" ON "ai_analysis"("stockId", "kind", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "backtest_results_stockId_signalType_horizon_key" ON "backtest_results"("stockId", "signalType", "horizon");

-- AddForeignKey
ALTER TABLE "stock_prices" ADD CONSTRAINT "stock_prices_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_indicators" ADD CONSTRAINT "technical_indicators_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_signals" ADD CONSTRAINT "technical_signals_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financials" ADD CONSTRAINT "financials_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ir_documents" ADD CONSTRAINT "ir_documents_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_stock_relations" ADD CONSTRAINT "news_stock_relations_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_stock_relations" ADD CONSTRAINT "news_stock_relations_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_stocks" ADD CONSTRAINT "watchlist_stocks_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_stocks" ADD CONSTRAINT "watchlist_stocks_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtest_results" ADD CONSTRAINT "backtest_results_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
