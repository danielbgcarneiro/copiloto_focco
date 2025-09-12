import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ViewTestResult {
  viewName: string;
  exists: boolean;
  rowCount: number;
  sampleData: any;
  error: string | null;
}

export const TestViews: React.FC = () => {
  const [results, setResults] = useState<ViewTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    testAllViews();
  }, []);

  const testAllViews = async () => {
    setLoading(true);
    
    // Obter informações do usuário
    const { data: { user } } = await supabase.auth.getUser();
    setUserInfo(user);
    
    const viewsToTest = [
      'vw_dashboard_metricas',
      'vw_top10_cidades',
      'vw_ranking_rotas',
      'vw_top20_clientes',
      'vw_dashboard_gestao_completo',
      'vw_performance_semanal',
      'vw_vendas_semanais'
    ];
    
    const testResults: ViewTestResult[] = [];
    
    for (const viewName of viewsToTest) {
      const result = await testView(viewName, user?.id);
      testResults.push(result);
    }
    
    setResults(testResults);
    setLoading(false);
  };

  const testView = async (viewName: string, userId?: string): Promise<ViewTestResult> => {
    try {
      let query = supabase.from(viewName).select('*', { count: 'exact' });
      
      // Aplicar filtro de usuário para views específicas
      if (userId && ['vw_dashboard_metricas', 'vw_top10_cidades', 'vw_ranking_rotas', 'vw_top20_clientes'].includes(viewName)) {
        if (viewName === 'vw_dashboard_metricas') {
          query = query.eq('vendedor_id', userId);
        } else {
          query = query.eq('vendedor_uuid', userId);
        }
      }
      
      // Limitar a 3 registros para amostra
      query = query.limit(3);
      
      const { data, error, count } = await query;
      
      if (error) {
        return {
          viewName,
          exists: false,
          rowCount: 0,
          sampleData: null,
          error: error.message
        };
      }
      
      return {
        viewName,
        exists: true,
        rowCount: count || data?.length || 0,
        sampleData: data,
        error: null
      };
    } catch (err: any) {
      return {
        viewName,
        exists: false,
        rowCount: 0,
        sampleData: null,
        error: err.message || 'Erro desconhecido'
      };
    }
  };

  const refreshDashboard = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Testando views do Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Teste de Views do Supabase</h2>
        
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <p className="text-sm text-gray-700">
            <strong>Usuário:</strong> {userInfo?.email || 'Não identificado'}
          </p>
          <p className="text-sm text-gray-700">
            <strong>ID:</strong> {userInfo?.id || 'N/A'}
          </p>
        </div>
        
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.viewName} className={`border rounded-lg p-4 ${result.exists ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{result.viewName}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${result.exists ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                  {result.exists ? 'EXISTE' : 'NÃO EXISTE'}
                </span>
              </div>
              
              {result.exists ? (
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Total de registros:</strong> {result.rowCount}
                  </p>
                  {result.sampleData && result.sampleData.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        Ver amostra de dados
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                        {JSON.stringify(result.sampleData, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-red-700">
                    <strong>Erro:</strong> {result.error}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={refreshDashboard}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Atualizar Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};