using Microsoft.AspNetCore.SignalR;

namespace FlightAggregatorApi.Hubs;

public class PriceHub : Hub
{
    public async Task JoinRoute(string routeFrom, string routeTo)
    {
        var groupName = $"route_{routeFrom}_{routeTo}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    }

    public async Task LeaveRoute(string routeFrom, string routeTo)
    {
        var groupName = $"route_{routeFrom}_{routeTo}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }
}
