//+------------------------------------------------------------------+
//|                                                      ProjectName |
//|                                      Copyright 2020, CompanyName |
//|                                       http://www.companyname.net |
//+------------------------------------------------------------------+
#property copyright "IFB"
#property link      "http://wintrade.net.br/"
#property version   "1.01"
#property description "IFB4.1"

// --- Inclusão da biblioteca para manipulação de JSON
#include <JAson.mqh> 

// --- Variáveis Globais para Licenciamento ---
string  serverUrl = "https://SEU_DOMINIO_AQUI/api/validate"; // <<<---- SUBSTITUA PELA URL DO SEU SERVIDOR
bool    isAuthorized = false;

#property indicator_separate_window
#property indicator_buffers 4
#property indicator_plots   2
//--- plot K
#property indicator_label1  "IFB4.1"
#property indicator_type1   DRAW_LINE
#property indicator_color1  clrGreen
#property indicator_style1  STYLE_SOLID
#property indicator_width1  1
//--- plot D
#property indicator_label2  "IFB4.1"
#property indicator_type2   DRAW_LINE
#property indicator_color2  clrRed
#property indicator_style2  STYLE_SOLID
#property indicator_width2  1

//--- input parameters
uint                 InpPeriodRSI      =  6;            // RSI Period
uint                 InpPeriodStoK     =  4;            // Stoch Period
uint                 InpSlowingK       =  4;             // Stoch Slowing K
uint                 InpSlowingD       =  4;             // Stoch Slowing D
ENUM_APPLIED_PRICE   InpAppliedPrice   =  PRICE_CLOSE;   // Applied price
double               InpOverbought     =  97.0;          // Overbought
double               InpOversold       =  7.0;          // Oversold
//--- indicator buffers
double         BufferK[];
double         BufferD[];
double         BufferRSI[];
double         BufferSKI[];
//--- global variables
int            period_rsi;
int            period_k;
int            period_sk;
int            period_sd;
int            handle_rsi;
int            weight_sum;
double         overbought;
double         oversold;

string short_name="IFB4.1";
//--- includes
#include <MovingAverages.mqh>

//+------------------------------------------------------------------+
//| Função de verificação de licença                                 |
//+------------------------------------------------------------------+
bool CheckLicense()
{
   char post[], result[];
   string headers;
   int res;

   string accountNumber = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string brokerServer = AccountInfoString(ACCOUNT_SERVER);

   string jsonData = StringFormat("{\"accountNumber\":\"%s\", \"brokerServer\":\"%s\"}",
                                   accountNumber,
                                   brokerServer);

   StringToCharArray(jsonData, post, 0, StringLen(jsonData), CP_UTF8);

   headers = "Content-Type: application/json\r\n";
   ResetLastError();
   
   res = WebRequest("POST", serverUrl, headers, 5000, post, result, headers);

   if(res == -1)
   {
      Print("Erro no WebRequest: ", GetLastError());
      return(false); 
   }
   
   if(res != 200)
   {
      PrintFormat("Erro HTTP! Código: %d. Resposta: %s", res, CharArrayToString(result));
      return(false);
   }

   string response = CharArrayToString(result);
   CJAVal json;
   
   if(!json.Deserialize(response))
   {
      Print("Erro ao decodificar a resposta JSON: ", response);
      return(false);
   }

   string status = json["status"].ToStr();
   string reason = json["reason"].ToStr();

   PrintFormat("Resposta do Servidor: Status: %s, Motivo: %s", status, reason);

   if(status == "authorized")
   {
      isAuthorized = true;
      return(true);
   }

   isAuthorized = false;
   Alert("Autorização negada pelo servidor. Motivo: ", reason);
   return(false);
}

//+------------------------------------------------------------------+
//| Custom indicator initialization function                         |
//+------------------------------------------------------------------+
int OnInit()
{
   // --- VERIFICAÇÃO DE LICENÇA ---
   if(!CheckLicense())
   {
      Alert("Licença inválida ou bloqueada! O indicador " + short_name + " não será executado.");
      return(INIT_FAILED);
   }
   Alert("Licença validada com sucesso! O indicador " + short_name + " foi iniciado.");
   // --- FIM DA VERIFICAÇÃO DE LICENÇA ---

//--- set global variables
   applyParams(Period());
   period_rsi=int(InpPeriodRSI<1 ? 1 : InpPeriodRSI);
   period_k=int(InpPeriodStoK<1 ? 1 : InpPeriodStoK);
   period_sk=int(InpSlowingK<2 ? 2 : InpSlowingK);
   period_sd=int(InpSlowingD<2 ? 2 : InpSlowingD);
   oversold=(InpOversold<0 ? 0 : InpOversold>99.9 ? 99.9 : InpOversold);
   overbought=(InpOverbought>100 ? 100 : InpOverbought<0.1 ? 0.1 : InpOverbought);
   if(overbought<=oversold)
      overbought=oversold+0.1;
   if(oversold>=overbought)
      oversold=overbought-0.1;
//--- indicator buffers mapping

   SetIndexBuffer(0,BufferK,INDICATOR_DATA);
   SetIndexBuffer(1,BufferD,INDICATOR_DATA);


   SetIndexBuffer(2,BufferRSI,INDICATOR_CALCULATIONS);
   SetIndexBuffer(3,BufferSKI,INDICATOR_CALCULATIONS);
//--- setting indicator parameters
   IndicatorSetString(INDICATOR_SHORTNAME,short_name);
   IndicatorSetInteger(INDICATOR_DIGITS,Digits());
   IndicatorSetDouble(INDICATOR_MINIMUM,0);
   IndicatorSetInteger(INDICATOR_LEVELS,2);
   IndicatorSetDouble(INDICATOR_LEVELVALUE,0,overbought);
   IndicatorSetDouble(INDICATOR_LEVELVALUE,1,oversold);

   IndicatorSetInteger(INDICATOR_LEVELCOLOR,0,clrYellow);
   IndicatorSetInteger(INDICATOR_LEVELCOLOR,1,clrYellow);

   IndicatorSetInteger(INDICATOR_LEVELSTYLE,0,STYLE_DOT);
   IndicatorSetInteger(INDICATOR_LEVELSTYLE,1,STYLE_DOT);



//--- setting buffer arrays as timeseries
   ArraySetAsSeries(BufferK,true);
   ArraySetAsSeries(BufferD,true);
   ArraySetAsSeries(BufferRSI,true);
   ArraySetAsSeries(BufferSKI,true);
//--- create MA's handles
   ResetLastError();
   handle_rsi=iRSI(NULL,PERIOD_CURRENT,period_rsi,InpAppliedPrice);
   if(handle_rsi==INVALID_HANDLE)
     {
      //Print("The iRSI(",(string)period_rsi,") object was not created: Error ",GetLastError());
      return INIT_FAILED;
     }
//---
   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
//| Custom indicator iteration function                              |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
{
   // --- VERIFICAÇÃO DE AUTORIZAÇÃO ---
   if(!isAuthorized)
   {
      return(0); // Não calcula nada se não estiver autorizado
   }
   // --- FIM DA VERIFICAÇÃO ---
   
   applyParams(Period());
  
//--- Проверка и расчёт количества просчитываемых баров
   if(rates_total<4)
      return 0;
//--- Проверка и расчёт количества просчитываемых баров
   int limit=rates_total-prev_calculated;
   if(limit>1)
     {
      limit=rates_total-1;
      ArrayInitialize(BufferK,EMPTY_VALUE);
      ArrayInitialize(BufferD,EMPTY_VALUE);
      ArrayInitialize(BufferRSI,0);
      ArrayInitialize(BufferSKI,0);
     }
//--- Подготовка данных
   int count=(limit>1 ? rates_total : 1),copied=0;
   copied=CopyBuffer(handle_rsi,0,0,count,BufferRSI);
   if(copied!=count)
      return 0;
   for(int i=limit; i>=0 && !IsStopped(); i--)
     {
      int bl=ArrayMinimum(BufferRSI,i,period_k);
      int bh=ArrayMaximum(BufferRSI,i,period_k);
      if(bl==WRONG_VALUE || bh==WRONG_VALUE)
         continue;
      double min=BufferRSI[bl];
      double max=BufferRSI[bh];
      BufferSKI[i]=(min==max ? 100.0 : 100.0*(BufferRSI[i]-min)/(max-min));
     }

//--- Расчёт индикатора
   if(SimpleMAOnBuffer(rates_total,prev_calculated,period_k,period_sk,BufferSKI,BufferK)==0)
      return 0;
   if(SimpleMAOnBuffer(rates_total,prev_calculated,period_sk,period_sd,BufferK,BufferD)==0)
      return 0;

//--- return value of prev_calculated for next call

   return(rates_total);
  }
//+------------------------------------------------------------------+
/* AQUI COMEÇAM AS CUSTOMIZAÇÕES */

//+------------------------------------------------------------------+
//+------------------------------------------------------------------+
void applyParams(int delta)
  {
   switch(delta)
     {
      case  5:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  6:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  10:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  12:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  15:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  20:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  30:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  16385:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  16386:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  16387:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  16388:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  16390:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  16392:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      case  16396:

         break;
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;

      case  16408:
         InpPeriodRSI      =  6;
         InpPeriodStoK     =  4;
         break;

      default:
         
         break;
     }
  }
//+------------------------------------------------------------------+
