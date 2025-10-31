//+------------------------------------------------------------------+
//|                                                      ProjectName |
//|                                      Copyright 2020, CompanyName |
//|                                       http://www.companyname.net |
//+------------------------------------------------------------------+
#property copyright "IFB"
#property link      "http://wintrade.net.br/"
#property version   "1.00"
#property description "IFB3"

#include <JAson.mqh> // Biblioteca para manipular JSON.

// --- Variáveis Globais de Licença ---
string  serverUrl = "https://SEU_DOMINIO_AQUI/api/validate"; // <<<---- SUBSTITUA PELA URL DO SEU SERVIDOR
bool    isAuthorized = false;


int RISK=3; // signal sensitivity control
int SSP=9;  // signal displacement

int NumberofAlerts=2;

double SellBuffer[];
double BuyBuffer[];

int K;
int counter=0;
bool pre,BT;

string short_name="IFB3";

#property indicator_chart_window
#property indicator_buffers 2
#property indicator_plots   2
#property indicator_type1   DRAW_ARROW
#property indicator_color1  Red
#property indicator_width1  2
#property indicator_label1  "Trendsignal Sell"
#property indicator_type2   DRAW_ARROW
#property indicator_color2  Lime
#property indicator_width2  2
#property indicator_label2 "Trendsignal Buy"

int StartBars;
//+------------------------------------------------------------------+
//| Initialization and checking for input parameters                 |
//+------------------------------------------------------------------+
int OnInit()
  {
   // --- Verificação de Licença ---
   if(!CheckLicense())
   {
      Alert("Licença inválida ou bloqueada! O indicador IFB3 não será executado.");
      return(INIT_FAILED); // Falha a inicialização se não estiver autorizado
   }
   Alert("Licença do IFB3 validada com sucesso! O indicador foi iniciado.");
   // --- Fim da verificação de licença ---

   applyParams(Period());

   StartBars=SSP+1;
   SetIndexBuffer(1,BuyBuffer,INDICATOR_DATA);
   PlotIndexSetInteger(1,PLOT_DRAW_BEGIN,StartBars);
   PlotIndexSetString(1,PLOT_LABEL,short_name);
   PlotIndexSetInteger(1,PLOT_ARROW,233);
   ArraySetAsSeries(BuyBuffer,true);

   SetIndexBuffer(0,SellBuffer,INDICATOR_DATA);
   PlotIndexSetInteger(0,PLOT_DRAW_BEGIN,StartBars);
   PlotIndexSetString(0,PLOT_LABEL,short_name);
   PlotIndexSetInteger(0,PLOT_ARROW,234);
   ArraySetAsSeries(SellBuffer,true);
   IndicatorSetInteger(INDICATOR_DIGITS,_Digits);
   IndicatorSetString(INDICATOR_SHORTNAME,short_name);
   
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//|                                                                  |
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
   // --- Proteção de Execução ---
   if(!isAuthorized)
   {
      return(0); // Não calcula nada se não estiver autorizado
   }
   // --- Fim da Proteção ---
   
   applyParams(Period());

   if(rates_total<StartBars)
      return(0);


   int limit;
   double Range,AvgRange,smin,smax,SsMax,SsMin,price;
   bool uptrend;

   if(prev_calculated>rates_total || prev_calculated<=0)
     {
      K=33-RISK;
      limit=rates_total-StartBars;
     }
   else
     {
      limit=rates_total-prev_calculated;
     }


   ArraySetAsSeries(high,true);
   ArraySetAsSeries(low,true);
   ArraySetAsSeries(close,true);


   uptrend=BT;


   for(int bar=limit; bar>=0; bar--)
     {

      if(rates_total!=prev_calculated && bar==0)
        {
         BT=uptrend;
        }

      Range=0;
      AvgRange=0;
      for(int iii=bar; iii<=bar+SSP; iii++)
         AvgRange=AvgRange+MathAbs(high[iii]-low[iii]);
      Range=AvgRange/(SSP+1);
      //----
      SsMax=low[bar];
      SsMin=close[bar];

      for(int kkk=bar; kkk<=bar+SSP-1; kkk++)
        {
         price=high[kkk];
         if(SsMax<price)
            SsMax=price;
         price=low[kkk];
         if(SsMin>=price)
            SsMin=price;
        }

      smin=SsMin+(SsMax-SsMin)*K/100;
      smax=SsMax-(SsMax-SsMin)*K/100;

      SellBuffer[bar]=0;
      BuyBuffer[bar]=0;

      if(close[bar]<smin)
         uptrend=false;
      if(close[bar]>smax)
         uptrend=true;

      if(uptrend!=pre && uptrend==true)
        {
         BuyBuffer[bar]=low[bar]-Range*0.5;

         if(bar==0)
           {
            if(counter<=NumberofAlerts)
              {
               //Alert("Trendsignal ",EnumToString(Period())," ",Symbol()," BUY");
               counter++;
              }
           }
         else
            counter=0;
        }
      if(uptrend!=pre && uptrend==false)
        {
         SellBuffer[bar]=high[bar]+Range*0.5;

         if(bar==0)
           {
            if(counter<=NumberofAlerts)
              {
               //Alert("Trendsignal ",EnumToString(Period())," ",Symbol()," SELL");
               counter++;
              }
           }
         else
            counter=0;
        }

      if(bar>0)
         pre=uptrend;
     }
//----
   
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
      
      case  2:
         RISK=-3;
         SSP=27;
         break;
    
      case  3:
         RISK=-3;
         SSP=27;
         break;
         
      case  4:
         RISK=-3;
         SSP=27;
         break;
      
      case  5:
         RISK=-3;
         SSP=27;
         break;

      case   6:
         RISK=-3;
         SSP=27;
         break;

      case  10:
         RISK=-3;
         SSP=27;
         break;

      case  12:
         RISK=-3;
         SSP=27;
         break;

      case  15:
         RISK=-3;
         SSP=27;
         break;

      case  20:
         RISK=-3;
         SSP=27;
         break;

      case  30:
         RISK=-3;
         SSP=27;
         break;

      case  16385:
         RISK=-3;
         SSP=27;
         break;

      case  16386:
         RISK=-3;
         SSP=27;
         break;

      case  16387:
         RISK=-3;
         SSP=27;
         break;

      case  16388:
         RISK=-3;
         SSP=27;
         break;

      case  16390:
         RISK=-3;
         SSP=27;
         break;

      case  16392:
         RISK=-3;
         SSP=27;
         break;

      case  16396:
         RISK=-3;
         SSP=27;
         break;

      case  16408:
         RISK=-3;
         SSP=27;
         break;

      default:
        
         break;
     }
  }

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
