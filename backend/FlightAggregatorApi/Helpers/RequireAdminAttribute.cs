using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;

namespace FlightAggregatorApi.Helpers;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireAdminAttribute : ActionFilterAttribute
{
    public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;
        var email = httpContext.Request.Headers["X-Admin-Email"].FirstOrDefault()
            ?? httpContext.Request.Query["email"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(email))
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Thiếu thông tin xác thực admin" });
            return;
        }

        var db = httpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null || user.Role != "Admin")
        {
            context.Result = new ObjectResult(new { message = "Không có quyền truy cập. Yêu cầu quyền Admin." })
            {
                StatusCode = 403
            };
            return;
        }

        httpContext.Items["AdminUser"] = user;
        await next();
    }
}
