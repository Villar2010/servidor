//+------------------------------------------------------------------+
//|                                                      ProjectName |
//|                                      Copyright 2020, CompanyName |
//|                                       http://www.companyname.net |
//+------------------------------------------------------------------+
#property copyright "IFB"
#property link      "http://wintrade.net.br/"
#property version   "1.00"
#property description "IFB6"

#include <JAson.mqh> // Biblioteca para manipular JSON.

//------------------------------------------------------------------
#property indicator_chart_window
#property indicator_buffers 4
#property indicator_plots   1
#property indicator_label1  "value"
#property indicator_type1   DRAW_COLOR_HISTOGRAM2
#property indicator_color1  clrSilver,clrLimeGreen,clrOrange
#property indicator_width1  2

//
//
//
//
//

int       PtrPeriod       = 10; // Precision trend period
double    PtrSensitivity  = 1.22;  // Precision trend sensitivity

double  valh[],vall[],valc[],signal[];

string short_name="IFB6";

// --- Variáveis Globais de Licença ---
string  serverUrl = "https://SEU_DOMINIO_AQUI/api/validate"; // <<<---- MUITO IMPORTANTE: SUBSTITUA PELA URL DO SEU SERVIDOR
bool    isAuthorized = false;
//------------------------------------------------------------------
//
//------------------------------------------------------------------
//
//
//
//
//

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
int OnInit()
  {
   // --- Verificação de Licença ---
   if(!CheckLicense())
   {
      Alert("Licença inválida ou bloqueada! O indicador/robô não será executado.");
      return(INIT_FAILED); // Falha a inicialização se não estiver autorizado
   }
   Alert("Licença validada com sucesso! O indicador/robô foi iniciado.");
   // --- Fim da verificação ---

   applyParams(Period());
   SetIndexBuffer(0,valh,INDICATOR_CALCULATIONS);
   SetIndexBuffer(1,vall,INDICATOR_CALCULATIONS);
   SetIndexBuffer(2,valc,INDICATOR_COLOR_INDEX);
   SetIndexBuffer(3,signal,INDICATOR_CALCULATIONS);
   IndicatorSetString(INDICATOR_SHORTNAME,short_name);
   //Print("To Aqui");
   
   return(INIT_SUCCEEDED);
  }

//------------------------------------------------------------------
//
//------------------------------------------------------------------
//
//
//
//
//

//+------------------------------------------------------------------+
//|                                                                  |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime& time[],
                const double& open[],
                const double& high[],
                const double& low[],
                const double& close[],
                const long& tick_volume[],
                const long& volume[],
                const int& spread[])
  {
   // --- Verificação de autorização contínua ---
   if(!isAuthorized)
   {
      return(0); // Não calcula nada se não estiver autorizado
   }
   // --- Fim da verificação ---
   
   ArrayResize(signal,1);
   applyParams(Period());
   
   if(Bars(_Symbol,_Period)<rates_total)
      return(-1);
   int i=(int)MathMax(prev_calculated-1,0);
   for(; i<rates_total && !_StopFlag; i++)
     {
      valc[i] = iPrecisionTrend(high,low,close,PtrPeriod,PtrSensitivity,i,rates_total);
      valh[i] = high[i];
      vall[i] = low[i];
     }
   signal[0]=99;

   return(i);
  }

//------------------------------------------------------------------
//
//------------------------------------------------------------------
//
//
//
//
//

#define _ptInstances     1
#define _ptInstancesSize 7
double  _ptWork[][_ptInstances*_ptInstancesSize];
#define __range 0
#define __trend 1
#define __avgr  2
#define __avgd  3
#define __avgu  4
#define __minc  5
#define __maxc  6
double iPrecisionTrend(const double& _high[], const double& _low[], const double& _close[], int _period, double _sensitivity, int i, int bars, int instanceNo=0)
  {
   if(ArrayRange(_ptWork,0)!=bars)
      ArrayResize(_ptWork,bars);
   instanceNo*=_ptInstancesSize;
   int r=i;

//
//
//
//
//

   _ptWork[r][instanceNo+__range] = _high[i]-_low[i];
   _ptWork[r][instanceNo+__avgr]  = _ptWork[r][instanceNo+__range];
   int k=1;
   for(; k<_period && (r-k)>=0; k++)
      _ptWork[r][instanceNo+__avgr] += _ptWork[r-k][instanceNo+__range];
   _ptWork[r][instanceNo+__avgr] /= k;
   _ptWork[r][instanceNo+__avgr] *= _sensitivity;

//
//
//
//
//

   if(r==0)
     {
      _ptWork[r][instanceNo+__trend] = 0;
      _ptWork[r][instanceNo+__avgd] = _close[i]-_ptWork[r][instanceNo+__avgr];
      _ptWork[r][instanceNo+__avgu] = _close[i]+_ptWork[r][instanceNo+__avgr];
      _ptWork[r][instanceNo+__minc] = _close[i];
      _ptWork[r][instanceNo+__maxc] = _close[i];
     }
   else
     {
      _ptWork[r][instanceNo+__trend] = _ptWork[r-1][instanceNo+__trend];
      _ptWork[r][instanceNo+__avgd]  = _ptWork[r-1][instanceNo+__avgd];
      _ptWork[r][instanceNo+__avgu]  = _ptWork[r-1][instanceNo+__avgu];
      _ptWork[r][instanceNo+__minc]  = _ptWork[r-1][instanceNo+__minc];
      _ptWork[r][instanceNo+__maxc]  = _ptWork[r-1][instanceNo+__maxc];

      //
      //
      //
      //
      //

      switch((int)_ptWork[r-1][instanceNo+__trend])
        {
         case 0 :
            if(_close[i]>_ptWork[r-1][instanceNo+__avgu])
              {
               _ptWork[r][instanceNo+__minc]  = _close[i];
               _ptWork[r][instanceNo+__avgd]  = _close[i]-_ptWork[r][instanceNo+__avgr];
               _ptWork[r][instanceNo+__trend] =  1;
               signal[0]=7;
              }
            if(_close[i]<_ptWork[r-1][instanceNo+__avgd])
              {
               _ptWork[r][instanceNo+__maxc]  = _close[i];
               _ptWork[r][instanceNo+__avgu]  = _close[i]+_ptWork[r][instanceNo+__avgr];
               _ptWork[r][instanceNo+__trend] =  2;
               signal[0]=7;
              }
            break;
         case 1 :

            _ptWork[r][instanceNo+__avgd] = _ptWork[r-1][instanceNo+__minc] - _ptWork[r][instanceNo+__avgr];
            if(_close[i]>_ptWork[r-1][instanceNo+__minc])
               _ptWork[r][instanceNo+__minc] = _close[i];
            signal[0]=5;
            if(_close[i]<_ptWork[r-1][instanceNo+__avgd])
              {
               _ptWork[r][instanceNo+__maxc] = _close[i];
               _ptWork[r][instanceNo+__avgu] = _close[i]+_ptWork[r][instanceNo+__avgr];
               _ptWork[r][instanceNo+__trend] = 2;
               //Print("Vender");
               signal[0]=5;
              }

            break;
         case 2 :

            _ptWork[r][instanceNo+__avgu] = _ptWork[r-1][instanceNo+__maxc] + _ptWork[r][instanceNo+__avgr];
            if(_close[i]<_ptWork[r-1][instanceNo+__maxc])
               _ptWork[r][instanceNo+__maxc] = _close[i];
            signal[0]=6;
            if(_close[i]>_ptWork[r-1][instanceNo+__avgu])
              {
               _ptWork[r][instanceNo+__minc]  = _close[i];
               _ptWork[r][instanceNo+__avgd]  = _close[i]-_ptWork[r][instanceNo+__avgr];
               _ptWork[r][instanceNo+__trend] = 1;
               //Print("Comprar");
               signal[0]=6;
              }

        }
     }
   return(_ptWork[r][instanceNo+__trend]);
  }

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
         PtrPeriod       = 7;
         PtrSensitivity  = 2.2;
         break;
         
      case  3:
         PtrPeriod       = 7;
         PtrSensitivity  = 2.0;
         break;
         
      case  4:
         PtrPeriod       = 7;
         PtrSensitivity  = 2.1;
         break;
         
      case  5:
         PtrPeriod       = 7;
         PtrSensitivity  = 2.0;
         break;

      case  6:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.9;
         break;

      case  10:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  12:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  15:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  20:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  30:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  16385:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  16386:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  16387:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  16388:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  16390:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  16392:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  16396:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      case  16408:
         PtrPeriod       = 7;
         PtrSensitivity  = 1.8;
         break;

      default:
         
         break;
     }

  }
//+------------------------------------------------------------------+

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
