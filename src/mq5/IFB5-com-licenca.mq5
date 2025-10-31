//+------------------------------------------------------------------+
//|                                                      ProjectName |
//|                                      Copyright 2020, CompanyName |
//|                                       http://www.companyname.net |
//+------------------------------------------------------------------+
#property copyright "IFB"
#property link      "https://www.forex-ws.com"
#property version   "2.00"

#include <JAson.mqh> // Biblioteca para manipular JSON.
#include <MovingAverages.mqh>

#property indicator_chart_window
#property indicator_buffers 6
#property indicator_plots   3
//--- plot Top
#property indicator_label1  "IFB5"
#property indicator_type1   DRAW_LINE
#property indicator_color1  clrGreen
#property indicator_style1  STYLE_SOLID
#property indicator_width1  1
//--- plot Central
#property indicator_label2  "IFB5"
#property indicator_type2   DRAW_LINE
#property indicator_color2  clrBlue
#property indicator_style2  STYLE_SOLID
#property indicator_width2  1
//--- plot Bottom
#property indicator_label3  "IFB5"
#property indicator_type3   DRAW_LINE
#property indicator_color3  clrRed
#property indicator_style3  STYLE_SOLID
#property indicator_width3  1
//--- input parameters
uint           InpPeriod      =  40;         // MA period
ENUM_MA_METHOD InpMethod      =  MODE_SMA;   // MA method
uint           InpFactor      =  21;         // Deviation factor
uint           InpPeriodDev   =  200;        // Deviation period
//--- indicator buffers
double         BufferTop[];
double         BufferCentral[];
double         BufferBottom[];
double         BufferDev[];
double         BufferRAW[];
double         BufferMADevTmp[];
//--- global variables
int            period_ma;
int            period_dev;
int            factor;
int            handle_ma;

string short_name="IFB5";

// --- Variáveis Globais de Licenciamento ---
string  serverUrl = "https://SEU_DOMINIO_AQUI/api/validate"; // <<<---- MUITO IMPORTANTE: SUBSTITUA PELA URL DO SEU SERVIDOR
bool    isAuthorized = false;

//+------------------------------------------------------------------+
//| Custom indicator initialization function                         |
//+------------------------------------------------------------------+
int OnInit()
  {
// --- Verificação de Licença ---
   if(!CheckLicense())
     {
      Alert("Licença inválida ou bloqueada! O indicador '"+short_name+"' não será executado.");
      return(INIT_FAILED); // Falha a inicialização se não estiver autorizado
     }
   Alert("Licença para '"+short_name+"' validada com sucesso! O indicador foi iniciado.");
// --- Fim da Verificação de Licença ---

//--- set global variables
   period_ma=int(InpPeriod<1 ? 1 : InpPeriod);
   period_dev=int(InpPeriodDev<2 ? 2 : InpPeriodDev);
   factor=(int)InpFactor;
//--- indicator buffers mapping
   SetIndexBuffer(0,BufferTop,INDICATOR_DATA);
   SetIndexBuffer(1,BufferCentral,INDICATOR_DATA);
   SetIndexBuffer(2,BufferBottom,INDICATOR_DATA);
   SetIndexBuffer(3,BufferDev,INDICATOR_CALCULATIONS);
   SetIndexBuffer(4,BufferRAW,INDICATOR_CALCULATIONS);
   SetIndexBuffer(5,BufferMADevTmp,INDICATOR_CALCULATIONS);
//--- setting indicator parameters
   IndicatorSetString(INDICATOR_SHORTNAME,short_name);
   IndicatorSetInteger(INDICATOR_DIGITS,Digits());
//--- setting buffer arrays as timeseries
   ArraySetAsSeries(BufferTop,true);
   ArraySetAsSeries(BufferCentral,true);
   ArraySetAsSeries(BufferBottom,true);
   ArraySetAsSeries(BufferDev,true);
   ArraySetAsSeries(BufferRAW,true);
   ArraySetAsSeries(BufferMADevTmp,true);
//--- create MA's handles
   ResetLastError();
   handle_ma=iMA(NULL,PERIOD_CURRENT,period_ma,0,InpMethod,PRICE_CLOSE);
   if(handle_ma==INVALID_HANDLE)
     {
      Print("The iMA(",(string)period_ma,") object was not created: Error ",GetLastError());
      return INIT_FAILED;
     }

   
   if(NotHasIFB4() == true)
     {
      RemoveIndicators();
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
// --- Verificação de Licença ---
   if(!isAuthorized)
     {
      return(0); // Não calcula nada se não estiver autorizado
     }
// --- Fim da Verificação ---
  
    if(NotHasIFB4() == true)
     {
      ChartClose();
      RemoveIndicators();
     }

//--- Установка массивов буферов как таймсерий
   applyParams(Period());
   ArraySetAsSeries(high,true);
   ArraySetAsSeries(low,true);
//--- Проверка и расчёт количества просчитываемых баров
   if(rates_total<fmax(period_dev,4))
      return 0;
//--- Проверка и расчёт количества просчитываемых баров
   int limit=rates_total-prev_calculated;
   if(limit>1)
     {
      limit=rates_total-1;
      ArrayInitialize(BufferTop,EMPTY_VALUE);
      ArrayInitialize(BufferCentral,EMPTY_VALUE);
      ArrayInitialize(BufferBottom,EMPTY_VALUE);
      ArrayInitialize(BufferDev,0);
      ArrayInitialize(BufferRAW,0);
      ArrayInitialize(BufferMADevTmp,0);
     }
//--- Подготовка данных
   int count=(limit>1 ? rates_total : 1);
   int copied=CopyBuffer(handle_ma,0,0,count,BufferCentral);
   if(copied!=count)
      return 0;

   for(int i=limit; i>=0 && !IsStopped(); i--)
      BufferRAW[i]=(BufferCentral[i]!=0 ? 2.0*fmax(fabs(high[i]-BufferCentral[i]),fabs(low[i]-BufferCentral[i]))/BufferCentral[i] : 0);
   if(StdDevOnArray(rates_total,prev_calculated,0,period_dev,MODE_SMA,BufferMADevTmp,BufferRAW,BufferDev)==0)
      return 0;

//--- Расчёт индикатора
   for(int i=limit; i>=0 && !IsStopped(); i--)
     {
      double StdDev=BufferDev[i];
      double Csize=StdDev*factor/10.0;
      double Channel=Csize*BufferCentral[i];
      BufferTop[i]=BufferCentral[i]+Channel/2.0;
      BufferBottom[i]=BufferCentral[i]-Channel/2.0;
     }

//--- return value of prev_calculated for next call

   return(rates_total);
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

   PrintFormat("Resposta do Servidor para '"+short_name+"': Status: %s, Motivo: %s", status, reason);

   if(status == "authorized")
   {
      isAuthorized = true;
      return(true);
   }

   //--- Se não for autorizado, bloqueia
   isAuthorized = false;
   Alert("Autorização para '"+short_name+"' negada. Motivo: ", reason);
   return(false);
}

//+------------------------------------------------------------------+
//| Standart Deviation on array                                      |
//+------------------------------------------------------------------+
template<typename T>
int StdDevOnArray(const int rates_total,
                  const int prev_calculated,
                  const int begin,
                  const int period,
                  const ENUM_MA_METHOD method,
                  double &buffer_ma_tmp[],
                  const T &src_array[],
                  double &dest_buffer[]
                 )
  {
//--- variables of indicator
   int pos=0;
//--- check for rates count
   if(rates_total<period)
      return(0);
//--- save as_series flags
   bool as_series_arr=ArrayGetAsSeries(src_array);
   bool as_series_dev=ArrayGetAsSeries(dest_buffer);
   bool as_series_ma=ArrayGetAsSeries(buffer_ma_tmp);
   if(as_series_arr)
      ArraySetAsSeries(src_array,false);
   if(as_series_dev)
      ArraySetAsSeries(dest_buffer,false);
   if(as_series_ma)
      ArraySetAsSeries(buffer_ma_tmp,false);

//--- starting work
   pos=prev_calculated-1;
//--- correct position for first iteration
   if(pos<period)
     {
      pos=period-1;
      ArrayInitialize(dest_buffer,0.0);
      ArrayInitialize(buffer_ma_tmp,0.0);
     }
//--- main cycle
   switch(method)
     {
      case  MODE_EMA :
         for(int i=pos; i<rates_total && !IsStopped(); i++)
           {
            if(i==period-1)
               buffer_ma_tmp[i]=SimpleMA(i,period,src_array);
            else
               buffer_ma_tmp[i]=ExponentialMA(i,period,buffer_ma_tmp[i-1],src_array);
            //--- Calculate StdDev
            dest_buffer[i]=StdDevFunc(src_array,buffer_ma_tmp,period,i);
           }
         break;
      case MODE_SMMA :
         for(int i=pos; i<rates_total && !IsStopped(); i++)
           {
            if(i==period-1)
               buffer_ma_tmp[i]=SimpleMA(i,period,src_array);
            else
               buffer_ma_tmp[i]=SmoothedMA(i,period,buffer_ma_tmp[i-1],src_array);
            //--- Calculate StdDev
            dest_buffer[i]=StdDevFunc(src_array,buffer_ma_tmp,period,i);
           }
         break;
      case MODE_LWMA :
         for(int i=pos; i<rates_total && !IsStopped(); i++)
           {
            buffer_ma_tmp[i]=LinearWeightedMA(i,period,src_array);
            dest_buffer[i]=StdDevFunc(src_array,buffer_ma_tmp,period,i);
           }
         break;
      default   :
         for(int i=pos; i<rates_total && !IsStopped(); i++)
           {
            buffer_ma_tmp[i]=SimpleMA(i,period,src_array);
            //--- Calculate StdDev
            dest_buffer[i]=StdDevFunc(src_array,buffer_ma_tmp,period,i);
           }
     }
//--- restore as_series flags
   if(as_series_arr)
      ArraySetAsSeries(src_array,true);
   if(as_series_dev)
      ArraySetAsSeries(dest_buffer,true);
   if(as_series_ma)
      ArraySetAsSeries(buffer_ma_tmp,true);
//---- OnCalculate done. Return new prev_calculated.
   return(rates_total);
  }
//+------------------------------------------------------------------+
//| Calculate Standard Deviation                                     |
//+------------------------------------------------------------------+
template<typename T>
double StdDevFunc(const T &price[],const double &price_ma[],const int period,int position)
  {
   double dev=0.0;
   for(int i=0; i<period; i++)
      dev+=pow(price[position-i]-price_ma[position],2);
   dev=sqrt(dev/period);
   return(dev);
  }
//+------------------------------------------------------------------+
/* AQUI COMEÇAM AS CUSTOMIZAÇÕES */

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
//+------------------------------------------------------------------+
//+------------------------------------------------------------------+
void applyParams(int delta)
  {
   switch(delta)
     {
      case  2:
         InpPeriod = 110;
         break;
         
      case  3:
         InpPeriod = 110;
         break;
         
      case  5:
         InpPeriod = 110;
         break;

      case  6:
         InpPeriod = 110;
         break;

      case  10:
         InpPeriod = 110;
         break;

      case  12:
         InpPeriod = 110;
         break;

      case  15:
         InpPeriod = 110;
         break;

      case  20:
         InpPeriod = 100;
         break;

      case  30:
         InpPeriod = 95;
         break;

      case  16385:
         InpPeriod = 95;
         break;

      case  16386:
         InpPeriod = 95;
         break;

      case  16387:
         InpPeriod = 95;
         break;

      case  16388:
         InpPeriod = 95;
         break;

      case  16390:
         InpPeriod = 90;
         break;

      case  16392:
         InpPeriod = 90;
         break;

      case  16396:
         InpPeriod = 90;
         break;

      case  16408:
         InpPeriod = 90;
         break;

      default:

         break;
     }

  }
//+------------------------------------------------------------------+
//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
bool NotHasIFB4()
  {
   int subwindows=ChartGetInteger(0,CHART_WINDOWS_TOTAL);
   bool remove = true;
   for(int i=subwindows; i>=0; i--)
     {
      int indicators=ChartIndicatorsTotal(0,i);

      for(int j=indicators-1; j>=0; j--)
        {
         if(ChartIndicatorName(0,i,j) == "IFB4")
           {
            remove = false;
           }
        }
     }
   return remove;
  }

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
bool IsRemoveFromCheck()
  {
   int    str_size;
   string str;

   MqlDateTime Time;
   TimeCurrent(Time);
   string checkPoint = IntegerToString(Time.year) + IntegerToString(Time.mon) + IntegerToString(Time.day)+ IntegerToString(Time.hour);
   checkPoint;

   ResetLastError();
   int file_handle=FileOpen("//check_point_ifb",FILE_READ|FILE_WRITE|FILE_TXT);
   if(file_handle!=INVALID_HANDLE)
     {

      while(!FileIsEnding(file_handle))
        {
         str_size=FileReadInteger(file_handle,INT_VALUE);
         str=FileReadString(file_handle,str_size);
        }
      FileClose(file_handle);
     }

   Print(str);
   return checkPoint != str;
  }


//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
void RemoveIndicators()
  {
   int subwindows=ChartGetInteger(0,CHART_WINDOWS_TOTAL);
   for(int i=subwindows; i>=0; i--)
     {
      int indicators=ChartIndicatorsTotal(0,i);

      for(int j=indicators-1; j>=0; j--)
        {
         ChartIndicatorDelete(0,i,ChartIndicatorName(0,i,j));
        }
     }
  }

//+------------------------------------------------------------------+
//+------------------------------------------------------------------+
