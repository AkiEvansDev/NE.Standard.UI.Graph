using System;

namespace DemoApp.Graph.Desktop;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
        => DesktopStartupBuilder.Run<GraphDesktopStartup, GraphAppStartup>(args);
}
