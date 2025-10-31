//+------------------------------------------------------------------+
//|                                                      ProjectName |
//|                                      Copyright 2020, CompanyName |
//|                                       http://www.companyname.net |
//+------------------------------------------------------------------+
#property copyright "IFB"
#property link      "http://wintrade.net.br/"
#property version   "1.00"
#property description "IFB4.2"

#include <MovingAverages.mqh>
#include <JAson.mqh> // Biblioteca para manipular JSON.

// --- Variáveis Globais de Licenciamento ---
string  serverUrl = "https://SEU_DOMINIO_AQUI/api/validate"; // <<<---- SUBSTITUA PELA URL DO SEU SERVIDOR
bool    isAuthorized = false;

//--- indicator settings
#property indicator_separate_window
#property indicator_buffers 10
#property indicator_plots   4
//--- TRIX
#property indicator_label1  "IFB4.2"
#property indicator_color1  clrRed
#property indicator_width1  1
#property indicator_type1   DRAW_LINE
#property indicator_style1  STYLE_SOLID
//--- Signal
#property indicator_label2  "IFB4.2"
#property indicator_color2  clrBlue
#property indicator_width2  1
#property indicator_type2   DRAW_LINE
#property indicator_style2  STYLE_DOT
//--- Arrows
#property indicator_label3  "IFB4.2"
#property indicator_color3  clrBlue
#property indicator_width3  1
#property indicator_type3   DRAW_ARROW
#property indicator_label4  "IFB4.2"
#property indicator_color4  clrRed
#property indicator_width4  1
#property indicator_type4   DRAW_ARROW
//---
#property indicator_applied_price PRICE_CLOSE
//--- input parameters
int               InpPeriodEMA   = 14;    // EMA period
int               InpSignalPeriod= 7;     // Signal period
ushort            InpCodeUp      = 233;   // Symbol code up
ushort            InpCodeDown    = 234;   // Symbol code down
//--- indicator buffers
double                  TRIX_Buffer[];
double                  Signal_Buffer[];
double                  Arrows_Buffer_Up[];
double                  Arrows_Buffer_Down[];

double                  EMA_TRIX[];
double                  SecondEMA_TRIX[];
double                  ThirdEMA_TRIX[];

double                  EMA_Signal[];
double                  SecondEMA_Signal[];
double                  ThirdEMA_Signal[];
double                  signal[];
string short_name="IFB4.2";
//+------------------------------------------------------------------+
//| Custom indicator initialization function                         |
//+------------------------------------------------------------------+
int OnInit()
  {
// --- Verificação de Licença ---
   if(!CheckLicense())
     {
      Alert("Licença inválida ou bloqueada! O indicador IFB4.2 não será executado.");
      return(INIT_FAILED);
     }
   Alert("Licença do IFB4.2 validada com sucesso! O indicador foi iniciado.");
// --- Fim da Verificação de Licença ---

   applyParams(Period());
//--- indicator buffers mapping
   SetIndexBuffer(0,TRIX_Buffer,INDICATOR_DATA);
//--- sets first bar from what index will be drawn
   PlotIndexSetInteger(0,PLOT_DRAW_BEGIN,3*InpPeriodEMA-3);
//--- name for index label
   PlotIndexSetString(0,PLOT_LABEL,0);
   SetIndexBuffer(1,Signal_Buffer,INDICATOR_DATA);
//--- sets first bar from what index will be drawn
   PlotIndexSetInteger(1,PLOT_DRAW_BEGIN,3*InpSignalPeriod-3);
//--- name for index label
   PlotIndexSetString(1,PLOT_LABEL,1);



   SetIndexBuffer(2,Arrows_Buffer_Up,INDICATOR_DATA);
//--- define the symbol code for drawing in PLOT_ARROW
   PlotIndexSetInteger(2,PLOT_ARROW,InpCodeUp);
//--- set the vertical shift of arrows in pixels
   PlotIndexSetInteger(2,PLOT_ARROW_SHIFT,5);
//--- set as an empty value 0
   PlotIndexSetDouble(2,PLOT_EMPTY_VALUE,0);
   SetIndexBuffer(3,Arrows_Buffer_Down,INDICATOR_DATA);
//--- define the symbol code for drawing in PLOT_ARROW
   PlotIndexSetInteger(3,PLOT_ARROW,InpCodeDown);
//--- set the vertical shift of arrows in pixels
   PlotIndexSetInteger(3,PLOT_ARROW_SHIFT,5);
//--- set as an empty value 0
   PlotIndexSetDouble(3,PLOT_EMPTY_VALUE,0);
//---
   SetIndexBuffer(4,EMA_TRIX,INDICATOR_CALCULATIONS);
   SetIndexBuffer(5,SecondEMA_TRIX,INDICATOR_CALCULATIONS);
   SetIndexBuffer(6,ThirdEMA_TRIX,INDICATOR_CALCULATIONS);
   SetIndexBuffer(7,EMA_Signal,INDICATOR_CALCULATIONS);
   SetIndexBuffer(8,SecondEMA_Signal,INDICATOR_CALCULATIONS);
   SetIndexBuffer(9,ThirdEMA_Signal,INDICATOR_CALCULATIONS);
   SetIndexBuffer(10,signal,INDICATOR_DATA);
//--- name for indicator label
   IndicatorSetString(INDICATOR_SHORTNAME,short_name);
//--- indicator digits
   IndicatorSetInteger(INDICATOR_DIGITS,5);
//---
   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
//| Triple Exponential Average                                       |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const int begin,
                const double &price[])
  {
// --- Verificação de Autorização ---
   if(!isAuthorized)
     {
      return(0); // Não calcula nada se não estiver autorizado
     }
// --- Fim da Verificação ---

   applyParams(Period());
//--- check for data
   if(rates_total<3*InpPeriodEMA-3 || rates_total<3*InpSignalPeriod-3)
      return(0);
//---
   int limit_TRIX;
   int limit_Signal;
   int limit_Arrows;
   if(prev_calculated==0)
     {
      limit_TRIX=3*(InpPeriodEMA-1);
      for(int i=0; i<limit_TRIX; i++)
         TRIX_Buffer[i]=EMPTY_VALUE;

      limit_Signal=3*(InpSignalPeriod-1);
      for(int i=0; i<limit_Signal; i++)
         Signal_Buffer[i]=EMPTY_VALUE;

      limit_Arrows=0;
     }
   else
      limit_TRIX=limit_Signal=limit_Arrows=prev_calculated-1;
//--- calculate EMA
   ExponentialMAOnBuffer(rates_total,prev_calculated,0,InpPeriodEMA,price,EMA_TRIX);
//--- calculate EMA on EMA array
   ExponentialMAOnBuffer(rates_total,prev_calculated,InpPeriodEMA-1,InpPeriodEMA,EMA_TRIX,SecondEMA_TRIX);
//--- calculate EMA on EMA array on EMA array
   ExponentialMAOnBuffer(rates_total,prev_calculated,2*InpPeriodEMA-2,InpPeriodEMA,SecondEMA_TRIX,ThirdEMA_TRIX);
//--- calculate TRIX
   for(int i=limit_TRIX; i<rates_total && !IsStopped(); i++)
     {
      if(ThirdEMA_TRIX[i-1]!=0.0)
         TRIX_Buffer[i]=(ThirdEMA_TRIX[i]-ThirdEMA_TRIX[i-1])/ThirdEMA_TRIX[i-1];
      else
         TRIX_Buffer[i]=0.0;
     }
//--- calculate signal
   ExponentialMAOnBuffer(rates_total,prev_calculated,0,InpSignalPeriod,price,EMA_Signal);
//--- calculate EMA on EMA array
   ExponentialMAOnBuffer(rates_total,prev_calculated,InpSignalPeriod-1,InpSignalPeriod,EMA_Signal,SecondEMA_Signal);
//--- calculate EMA on EMA array on EMA array
   ExponentialMAOnBuffer(rates_total,prev_calculated,2*InpSignalPeriod-2,InpSignalPeriod,SecondEMA_Signal,ThirdEMA_Signal);
//--- calculate signal
   for(int i=limit_Signal; i<rates_total && !IsStopped(); i++)
     {
      if(ThirdEMA_Signal[i-1]!=0.0)
         Signal_Buffer[i]=(ThirdEMA_Signal[i]-ThirdEMA_Signal[i-1])/ThirdEMA_Signal[i-1];
      else
         Signal_Buffer[i]=0.0;
     }
//--- calculate arrows
   bool print_msg = true;
   for(int i=limit_Arrows; i<rates_total && !IsStopped(); i++)
     {
      if(i>0)
        {

         if(Signal_Buffer[i-1]<TRIX_Buffer[i-1] && Signal_Buffer[i]>TRIX_Buffer[i])
           {
            Arrows_Buffer_Up[i]=TRIX_Buffer[i];
             WriteSignal(0);
           }
         else
           {
            Arrows_Buffer_Up[i]=0;
           }



         if(Signal_Buffer[i-1]>TRIX_Buffer[i-1] && Signal_Buffer[i]<TRIX_Buffer[i])
           {
            Arrows_Buffer_Down[i]=TRIX_Buffer[i];
            WriteSignal(1);
           }
         else
           {
            Arrows_Buffer_Down[i]=0;
           }
        }
     }
//--- OnCalculate done. Return new prev_calculated.
//removeIndicators();
   return(rates_total);
  }

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
void applyParams(int delta)
  {
   switch(delta)
     {
      case  3:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;
         
      case  4:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;
      
      case  5:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  6:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  10:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  12:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  15:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  20:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  30:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  16385:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  16386:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  16387:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  16388:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  16390:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  16392:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  16396:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;

      case  16408:
         InpPeriodEMA   = 14;
         InpSignalPeriod= 4;
         break;
     }


  }
//+------------------------------------------------------------------+

//+------------------------------------------------------------------+
//|GRAVANDO ARQUIVO IFB42
//+------------------------------------------------------------------+
int WriteSignal(int type)
  {
   string file_name = "signal_IFB4.2_"+Symbol()+"_"+Period()+".txt";
   ResetLastError();
   int file_handle=FileOpen("//"+file_name,FILE_READ|FILE_WRITE|FILE_TXT);
   if(file_handle!=INVALID_HANDLE)
     {
      FileWrite(file_handle,type);
      FileClose(file_handle);
     
     }
   return 0;
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
   res = WebRequest("POST", serverUrl, headers, 5000, post, result, headers);

   //--- Verificar se houve erro na requisição web
   if(res == -1)
   {
      Print("Erro no WebRequest: ", GetLastError());
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
