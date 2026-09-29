using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.Graph.Web;

internal sealed class GraphWebStartup : WebStartupBase<GraphAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
        => GraphWebServices.Register(services);
}
