//+------------------------------------------------------------------+
//|                                                         IFB1.mq5 |
//|                   Copyright 2009-2017, MetaQuotes Software Corp. |
//|                                              http://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright   "2009-2017, MetaQuotes Software Corp."
#property link        "http://www.mql5.com"
#property version     "1.00"
#property description "IFB1"

#property indicator_chart_window
#property indicator_buffers 1
#property indicator_plots   1
//---- plot ExtAMABuffer
#property indicator_label1  "IFB1"
#property indicator_type1   DRAW_LINE
#property indicator_color1  Red
#property indicator_style1  STYLE_SOLID
#property indicator_width1  1
//--- default applied price
#property indicator_applied_price PRICE_OPEN

// --- INCLUSÃO PARA VALIDAÇÃO DE LICENÇA ---
#include <JAson.mqh> // Biblioteca para manipular JSON.

//--- input parameters
int      InpPeriodAMA=7;      // AMA period
int      InpFastPeriodEMA=8;   // Fast EMA period
int      InpSlowPeriodEMA=20;  // Slow EMA period
int      InpShiftAMA=0;        // AMA shift

//--- indicator buffers
double         ExtAMABuffer[];

//--- VARIÁVEIS GLOBAIS PARA LICENÇA ---
string  serverUrl = "https://SEU_DOMINIO_AQUI/api/validate"; // <<<---- MUITO IMPORTANTE: SUBSTITUA PELA URL DO SEU SERVIDOR
bool    isAuthorized = false;

//--- global variables
double         ExtFastSC;
double         ExtSlowSC;
int            ExtPeriodAMA;
int            ExtSlowPeriodEMA;
int            ExtFastPeriodEMA;
string short_name="IFB1";

//+------------------------------------------------------------------+
//| Função de inicialização do Indicador                             |
//+------------------------------------------------------------------+
int OnInit()
  {
//--- Checar autorização na inicialização
   if(!CheckLicense())
     {
      Alert("Licença inválida ou bloqueada! O indicador não será executado.");
      return(INIT_FAILED); // Falha a inicialização se não estiver autorizado
     }
   
   Alert("Licença validada com sucesso! O indicador foi iniciado.");

//--- check for input values
   if(InpPeriodAMA<=0)
     {
      ExtPeriodAMA=10;
      printf("Input parameter InpPeriodAMA has incorrect value (%d). Indicator will use value %d for calculations.",
             InpPeriodAMA,ExtPeriodAMA);
     }
   else
      ExtPeriodAMA=InpPeriodAMA;
   if(InpSlowPeriodEMA<=0)
     {
      ExtSlowPeriodEMA=30;
      printf("Input parameter InpSlowPeriodEMA has incorrect value (%d). Indicator will use value %d for calculations.",
             InpSlowPeriodEMA,ExtSlowPeriodEMA);
     }
   else
      ExtSlowPeriodEMA=InpSlowPeriodEMA;
   if(InpFastPeriodEMA<=0)
     {
      ExtFastPeriodEMA=2;
      printf("Input parameter InpFastPeriodEMA has incorrect value (%d). Indicator will use value %d for calculations.",
             InpFastPeriodEMA,ExtFastPeriodEMA);
     }
   else
      ExtFastPeriodEMA=InpFastPeriodEMA;
//--- indicator buffers mapping
   SetIndexBuffer(0,ExtAMABuffer,INDICATOR_DATA);
//--- set shortname and change label

   PlotIndexSetString(0,PLOT_LABEL,short_name);
//--- set accuracy
   IndicatorSetInteger(INDICATOR_DIGITS,_Digits+1);
//--- sets first bar from what index will be drawn
   PlotIndexSetInteger(0,PLOT_DRAW_BEGIN,ExtPeriodAMA);
//--- set index shift
   PlotIndexSetInteger(0,PLOT_SHIFT,InpShiftAMA);
//--- calculate ExtFastSC & ExtSlowSC
   ExtFastSC=2.0/(ExtFastPeriodEMA+1.0);
   ExtSlowSC=2.0/(ExtSlowPeriodEMA+1.0);
//--- OnInit done
   
   return(INIT_SUCCEEDED);
  }
//+------------------------------------------------------------------+
//| Função de iteração do Indicador                                  |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const int begin,
                const double &price[])
  {
//--- Verifique sempre se está autorizado
   if(!isAuthorized)
     {
      return(0); // Não calcula nada se não estiver autorizado
     }
     
   int i;
//--- check for rates count
   if(rates_total<ExtPeriodAMA+begin)
      return(0);
//--- draw begin may be corrected
   if(begin!=0)
      PlotIndexSetInteger(0,PLOT_DRAW_BEGIN,ExtPeriodAMA+begin);
//--- detect position
   int pos=prev_calculated-1;
//--- first calculations
   if(pos<ExtPeriodAMA+begin)
     {
      pos=ExtPeriodAMA+begin;
      for(i=0; i<pos-1; i++)
         ExtAMABuffer[i]=0.0;
      ExtAMABuffer[pos-1]=price[pos-1];
     }
//--- main cycle
   for(i=pos; i<rates_total && !IsStopped(); i++)
     {
      //--- calculate SSC
      double dCurrentSSC=(CalculateER(i,price)*(ExtFastSC-ExtSlowSC))+ExtSlowSC;
      //--- calculate AMA
      double dPrevAMA=ExtAMABuffer[i-1];
      ExtAMABuffer[i]=pow(dCurrentSSC,2)*(price[i]-dPrevAMA)+dPrevAMA;
     }
//--- return value of prev_calculated for next call

   return(rates_total);
  }
//+------------------------------------------------------------------+
//| Calculate ER value                                               |
//+------------------------------------------------------------------+
double CalculateER(const int nPosition,const double &PriceData[])
  {
   double dSignal=fabs(PriceData[nPosition]-PriceData[nPosition-ExtPeriodAMA]);
   double dNoise=0.0;
   for(int delta=0; delta<ExtPeriodAMA; delta++)
      dNoise+=fabs(PriceData[nPosition-delta]-PriceData[nPosition-delta-1]);
   if(dNoise!=0.0)
      return(dSignal/dNoise);
   return(0.0);
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
