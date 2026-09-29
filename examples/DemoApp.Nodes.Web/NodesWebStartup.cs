using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.Nodes.Web;

internal sealed class NodesWebStartup : WebStartupBase<NodesAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
        => NodesWebServices.Register(services);
}
