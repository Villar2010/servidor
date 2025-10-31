//+------------------------------------------------------------------+
//|                                      Elliott Wave Oscillator.mq5 |
//|                        Copyright 2016, MetaQuotes Software Corp. |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2016, Hossein Nouri"
#property description "Fully Coded By Hossein Nouri"
#property description "Email : hsn.nouri@gmail.com"
#property description "Skype : hsn.nouri"
#property description "MQL5 Profile : https://www.mql5.com/en/users/hsnnouri"
#property description " "
#property description "Feel free to contact me for MQL4/MQL5 coding."
#property link      "https://www.mql5.com/en/users/hsnnouri"
#property version   "1.00"

#include <MovingAverages.mqh>
#include <JAson.mqh> // Biblioteca para manipular JSON.

//--- Variáveis Globais de Licença
string  serverUrl = "https://SEU_DOMINIO_AQUI/api/validate"; // <<<---- SUBSTITUA PELA URL DO SEU SERVIDOR
bool    isAuthorized = false;

//--- indicator settings
#property indicator_separate_window
#property indicator_buffers 5
#property indicator_plots   2
//--- plot EWO
#property indicator_label1  "EWO"
#property indicator_type1   DRAW_COLOR_HISTOGRAM
#property indicator_color1  clrGreen,clrLime,clrRed,clrMaroon
#property indicator_style1  STYLE_SOLID
#property indicator_width1  2
#property indicator_label2  "MA"
#property indicator_type2   DRAW_LINE
#property indicator_color2  clrDodgerBlue
#property indicator_style2  STYLE_DOT
#property indicator_width2  1

//--- input parameters
int                     InpFastMA=3;                                                //Fast Period
int                     InpSlowMA=16;                                               //Slow Period
ENUM_APPLIED_PRICE      InpPriceSource=PRICE_MEDIAN;                                //Apply to
ENUM_MA_METHOD          InpSmoothingMethod=MODE_SMA;                                //Method
string                  Desc="************ Moving Average of EWO ************";     //Description
bool                    InpShowMA=true;                                             //Show MA
int                     InpMaPeriod=5;                                              //Period
ENUM_MA_METHOD          InpMaMethod=MODE_SMA;                                       //Method
//--- indicator buffers
double         EWOBuffer[];
double         EWOColors[];
double         MABuffer[];
double         FastMABuffer[];
double         SlowMABuffer[];
//Variables
int FastMaHandle,SlowMaHandle;
int Begin;
int WeightedSum;
string short_name = "IFB4";
/* RELATORIOS */

//+------------------------------------------------------------------+
//| Função que verifica a licença no servidor web                    |
//+------------------------------------------------------------------+
bool CheckLicense()
{
   char post[], result[];
   string headers;
   int res;

   //--- Obter dados da conta
   string accountNumber = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string brokerServer = AccountInfoString(ACCOUNT_SERVER);

   //--- Montar o corpo da requisição (JSON)
   string jsonData = StringFormat("{\"accountNumber\":\"%s\", \"brokerServer\":\"%s\"}",
                                   accountNumber,
                                   brokerServer);

   //--- Converter a string para um array de char para o WebRequest
   StringToCharArray(jsonData, post, 0, StringLen(jsonData), CP_UTF8);

   //--- Definir os cabeçalhos da requisição
   headers = "Content-Type: application/json\r\n";

   //--- Limpar cookies antigos para garantir que a requisição seja nova
   ResetLastError();
   
   //--- Enviar a requisição POST
   // Timeout de 5 segundos (5000 ms)
   res = WebRequest("POST", serverUrl, headers, 5000, post, result, headers);

   //--- Verificar se houve erro na requisição web
   if(res == -1)
   {
      Print("Erro no WebRequest: ", GetLastError());
      // Você pode decidir se permite o uso offline ou não.
      // Retornar 'false' é mais seguro.
      return(false); 
   }
   
   //--- Checar o código de status HTTP
   if(res != 200)
   {
      PrintFormat("Erro HTTP! Código: %d. Resposta: %s", res, CharArrayToString(result));
      return(false);
   }

   //--- Processar a resposta JSON
   string response = CharArrayToString(result);
   CJAVal json;
   
   if(!json.Deserialize(response))
   {
      Print("Erro ao decodificar a resposta JSON: ", response);
      return(false);
   }

   //--- Verificar o status da autorização
   string status = json["status"].ToStr();
   string reason = json["reason"].ToStr();

   PrintFormat("Resposta do Servidor: Status: %s, Motivo: %s", status, reason);

   if(status == "authorized")
   {
      isAuthorized = true;
      return(true);
      
   }

   //--- Se não for autorizado, bloqueia
   isAuthorized = false;
   Alert("Autorização negada pelo servidor. Motivo: ", reason);
   return(false);
}

//+------------------------------------------------------------------+
//| Custom indicator initialization function                         |
//+------------------------------------------------------------------+
int OnInit()
  {
   // --- Verificação de Licença ---
   if(!CheckLicense())
   {
      Alert("Licença inválida ou bloqueada! O indicador não será executado.");
      return(INIT_FAILED);
   }
   Alert("Licença validada com sucesso! O indicador foi iniciado.");
   // --- Fim da Verificação de Licença ---

//--- indicator buffers mapping
   Begin=MathMax(InpFastMA,InpSlowMA);
   SetIndexBuffer(0,EWOBuffer,INDICATOR_DATA);
   SetIndexBuffer(1,EWOColors,INDICATOR_COLOR_INDEX);
   SetIndexBuffer(2,MABuffer,INDICATOR_DATA);
   SetIndexBuffer(3,FastMABuffer,INDICATOR_CALCULATIONS);
   SetIndexBuffer(4,SlowMABuffer,INDICATOR_CALCULATIONS);
   PlotIndexSetInteger(0,PLOT_DRAW_BEGIN,Begin);
   PlotIndexSetInteger(1,PLOT_DRAW_BEGIN,Begin+InpMaPeriod);

   IndicatorSetString(INDICATOR_SHORTNAME,short_name);
   PlotIndexSetString(0,PLOT_LABEL,"IFB4");
   PlotIndexSetString(1,PLOT_LABEL,"IFB4");
   FastMaHandle=iMA(_Symbol,_Period,InpFastMA,0,InpSmoothingMethod,InpPriceSource);
   SlowMaHandle=iMA(_Symbol,_Period,InpSlowMA,0,InpSmoothingMethod,InpPriceSource);
   


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
   //--- Verificação de autorização
   if(!isAuthorized)
   {
      return(0); // Não faz nada se não estiver autorizado
   }

//---
   if(rates_total < MathMax(InpSlowMA,InpFastMA)+InpMaPeriod)
      return(0);
//--- not all data may be calculated
   int calculated=BarsCalculated(FastMaHandle);
   if(calculated<rates_total)
     {
      Print("Not all data of ExtFastMaHandle is calculated (",calculated,"bars ). Error",GetLastError());
      return(0);
     }
   calculated=BarsCalculated(SlowMaHandle);
   if(calculated<rates_total)
     {
      Print("Not all data of ExtSlowMaHandle is calculated (",calculated,"bars ). Error",GetLastError());
      return(0);
     }

   int to_copy;
   if(prev_calculated>rates_total || prev_calculated<0)
      to_copy=rates_total;
   else
     {
      to_copy=rates_total-prev_calculated;
      if(prev_calculated>0)
         to_copy++;
     }
   if(CopyBuffer(FastMaHandle,0,0,to_copy,FastMABuffer)<=0)
     {
      Print("Getting fast EMA is failed! Error",GetLastError());
     }
   if(CopyBuffer(SlowMaHandle,0,0,to_copy,SlowMABuffer)<=0)
     {
      Print("Getting slow SMA is failed! Error",GetLastError());
     }

   int limit;
   if(prev_calculated==0)
      limit=MathMax(InpSlowMA,InpFastMA);
   else
      limit=prev_calculated-1;

   for(int i=limit; i<rates_total && !IsStopped(); i++)
     {
      CalculateValue(i);
     }
   CalculateMA(rates_total,prev_calculated,limit);

//--- return value of prev_calculated for next call
   
   return(rates_total);
  }
//+------------------------------------------------------------------+
void CalculateValue(int index)
  {
   EWOBuffer[index]=FastMABuffer[index]-SlowMABuffer[index];

   if(EWOBuffer[index]==EWOBuffer[index-1])
     {
      EWOColors[index]=EWOColors[index-1];
      return;
     }
   if(EWOBuffer[index]>0)
     {
      if(EWOBuffer[index]>EWOBuffer[index-1])
        {
         EWOColors[index]=1;
         return;
        }
      if(EWOBuffer[index]<EWOBuffer[index-1])
        {
         EWOColors[index]=0;
         return;
        }
     }
   if(EWOBuffer[index]<0)
     {
      if(EWOBuffer[index]>EWOBuffer[index-1])
        {
         EWOColors[index]=3;
         return;
        }
      if(EWOBuffer[index]<EWOBuffer[index-1])
        {
         EWOColors[index]=2;
         return;
        }
     }

  }
//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
void CalculateMA(const int &rates_total,const int &prev_calculated,int limit)
  {
   if(InpShowMA==true)
     {
      if(InpMaMethod==MODE_SMA)
        {
         SimpleMAOnBuffer(rates_total,prev_calculated,Begin+InpMaPeriod,InpMaPeriod,EWOBuffer,MABuffer);
         return;
        }
      if(InpMaMethod==MODE_LWMA)
        {

         LinearWeightedMAOnBuffer(rates_total,prev_calculated,Begin+InpMaPeriod,InpMaPeriod,EWOBuffer,MABuffer,WeightedSum);
         return;
        }
      if(InpMaMethod==MODE_EMA)
        {
         ExponentialMAOnBuffer(rates_total,prev_calculated,Begin+InpMaPeriod,InpMaPeriod,EWOBuffer,MABuffer);
         return;
        }
      if(InpMaMethod==MODE_SMMA)
        {
         SmoothedMAOnBuffer(rates_total,prev_calculated,Begin+InpMaPeriod,InpMaPeriod,EWOBuffer,MABuffer);
         return;
        }
     }
   ArrayInitialize(MABuffer,EMPTY_VALUE);
  }
